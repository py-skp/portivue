# app/api/routes/instruments.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, and_
from sqlmodel import Session, select, col
import logging, time
from ..deps import get_session, get_current_user_2fa
from ...models.user import User
from ...models.instrument import Instrument
from ...models.price_history import PriceHistory
from ...schemas.instrument import (
    InstrumentCreate, InstrumentRead, PriceRead, InstrumentUpdate
)
from ...services.instruments import fetch_from_yahoo
from ...services.yf_client import fetch_profile_and_price
from ...services.price_refresher import refresh_all_yahoo_prices
from yahooquery import search as yq_search


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/instruments",
    tags=["instruments"],
    # keep your existing router-level dependency for other routes
    dependencies=[Depends(get_current_user_2fa)],
)

# ---------- helpers ----------

def _utc_from_unix(ts: Optional[int]) -> Optional[datetime]:
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
    except Exception:
        return datetime.now(tz=timezone.utc)

class ManualPricePayload(BaseModel):
    price: float
    at: Optional[datetime] = None  # optional ISO timestamp; defaults to now

# ---------- health probe (no auth, no DB) ----------
# Mount a tiny *separate* router without dependencies just for health.
health_router = APIRouter(prefix="/instruments", tags=["instruments"])

@health_router.get("/_ping", include_in_schema=False)
def instruments_ping():
    return {"ok": True, "message": "pong"}


# ---------- Yahoo suggestions ----------

@router.get("/suggest")
def suggest(q: str, limit: int = 10):
    res = yq_search(q)
    items = []
    for it in (res.get("quotes") or [])[: limit * 3]:
        sym = it.get("symbol")
        nm = it.get("shortname") or it.get("longname") or it.get("name")
        if not sym or not nm:
            continue
        items.append({
            "name": nm,
            "symbol": sym,
            "currency": it.get("currency"),
            "exchange": it.get("exchDisp") or it.get("exchange"),
            "type": it.get("quoteType") or it.get("typeDisp"),
        })
    # de-dup & trim (symbol + exchange)
    seen = set(); uniq = []
    for it in items:
        k = (it["symbol"], it.get("exchange") or "")
        if k in seen:
            continue
        seen.add(k); uniq.append(it)
    return {"items": uniq[:limit]}


# ---------- list / get ----------

@router.get("", response_model=List[InstrumentRead])
def list_instruments(
    q: Optional[str] = Query(None, description="Substring on name or symbol"),
    data_source: Optional[str] = Query(None, pattern="^(manual|yahoo)$"),
    limit: int = Query(50, ge=1, le=1000),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user_2fa),
):
    """
    - default: PUBLIC Yahoo instruments + THIS USER'S manual instruments
    - data_source='manual': only this user's manual
    - data_source='yahoo': only public yahoo
    """
    base_stmt = select(Instrument)

    if data_source == "manual":
        stmt = base_stmt.where(
            and_(Instrument.data_source == "manual", Instrument.owner_user_id == user.id)
        )
    elif data_source == "yahoo":
        stmt = base_stmt.where(Instrument.data_source == "yahoo")
    else:
        stmt = base_stmt.where(
            or_(
                Instrument.data_source == "yahoo",
                and_(Instrument.data_source == "manual", Instrument.owner_user_id == user.id),
            )
        )

    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(col(Instrument.name).ilike(like), col(Instrument.symbol).ilike(like))
        )

    stmt = stmt.order_by(Instrument.name).limit(limit)
    return session.exec(stmt).all()


@router.get("/{instrument_id}", response_model=InstrumentRead)
def get_instrument(
    instrument_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user_2fa),
):
    inst = session.get(Instrument, instrument_id)
    if not inst:
        raise HTTPException(404, "Instrument not found")

    # Access rules:
    # - Yahoo/public: allowed to all
    # - Manual/private: only owner
    if inst.data_source == "yahoo":
        return inst
    if inst.owner_user_id == user.id:
        return inst
    raise HTTPException(404, "Instrument not found")


# ---------- create / update (manual only) ----------

@router.post("", response_model=InstrumentRead, status_code=status.HTTP_201_CREATED)
def create_instrument(
    payload: InstrumentCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user_2fa),
):
    """
    Create a MANUAL instrument private to the current user.
    Prevents per-user duplicates by symbol (case-insensitive) if a symbol is provided.
    """
    ds = (payload.data_source or "manual").lower()
    if ds != "manual":
        ds = "manual"

    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(400, "name is required")

    symbol = (payload.symbol or "").strip()
    symbol = symbol.upper() if symbol else None

    # prevent duplicates by (user, symbol) for manual rows
    if symbol:
        dup = session.exec(
            select(Instrument).where(
                (Instrument.data_source == "manual")
                & (Instrument.owner_user_id == user.id)
                & (col(Instrument.symbol).ilike(symbol))
            )
        ).first()
        if dup:
            raise HTTPException(409, "Instrument already exists")

    inst = Instrument(
        symbol=symbol,
        name=name,
        sector=payload.sector,
        currency_code=payload.currency_code,
        asset_class=payload.asset_class,
        asset_subclass=payload.asset_subclass,
        country=payload.country,
        data_source=ds,
        owner_user_id=user.id,  # private
    )
    session.add(inst)
    session.commit()
    session.refresh(inst)
    return inst


@router.patch("/{instrument_id}", response_model=InstrumentRead)
def update_instrument(
    instrument_id: int,
    payload: InstrumentUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user_2fa),
):
    """
    Edits are allowed only for YOUR manual instruments.
    Yahoo/public rows are read-only from this endpoint.
    """
    inst = session.get(Instrument, instrument_id)
    if not inst:
        raise HTTPException(404, "Instrument not found")
    if not (inst.data_source == "manual" and inst.owner_user_id == user.id):
        raise HTTPException(403, "Only your manual instruments can be edited")

    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is not None:
        nm = str(updates["name"]).strip()
        if not nm:
            raise HTTPException(400, "name cannot be empty")
        updates["name"] = nm

    if "symbol" in updates:
        raw = updates["symbol"]
        sym = str(raw).strip().upper() if raw else None
        if sym:
            dup = session.exec(
                select(Instrument).where(
                    (Instrument.data_source == "manual")
                    & (Instrument.owner_user_id == user.id)
                    & (col(Instrument.symbol).ilike(sym))
                    & (Instrument.id != instrument_id)
                )
            ).first()
            if dup:
                raise HTTPException(409, "Instrument already exists")
        updates["symbol"] = sym

    for k, v in updates.items():
        setattr(inst, k, v)

    session.add(inst)
    session.commit()
    session.refresh(inst)
    return inst


# ---------- Yahoo upsert (PUBLIC one row per symbol) ----------

@router.post("/upsert_from_yahoo", response_model=InstrumentRead)
def upsert_from_yahoo(
    symbol: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
):
    """
    Return existing PUBLIC yahoo instrument (if present) or create it once.
    Public rows have owner_user_id = NULL and are shared by all users.
    """
    sym = symbol.upper().strip()

    existing = session.exec(
        select(Instrument).where(
            (Instrument.data_source == "yahoo") & (Instrument.symbol == sym)
        )
    ).first()
    if existing:
        return existing

    data = fetch_profile_and_price(sym, is_crypto=False)
    if not data:
        raise HTTPException(404, "Symbol not found on Yahoo")

    inst = Instrument(
        symbol=sym,
        name=data["name"],
        sector=data.get("sector"),
        currency_code=data["currency_code"],
        asset_class=data.get("asset_class"),
        asset_subclass=data.get("asset_subclass"),
        country=data.get("country"),
        latest_price=data.get("latest_price"),
        latest_price_at=data.get("latest_price_at"),
        data_source="yahoo",     # PUBLIC row
        # owner_user_id stays NULL
    )
    session.add(inst)
    session.commit()
    session.refresh(inst)
    return inst


# ---------- manual price entry (private per user) ----------

@router.post("/{instrument_id}/price_manual", response_model=PriceRead)
def add_manual_price(
    instrument_id: int,
    payload: ManualPricePayload | dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user_2fa),
):
    """
    Add a manual price for YOUR manual instrument.
    Accepts either:
      { "price": 123.45, "at": "2025-09-20T00:00:00Z" }
    or
      { "close": 123.45, "date": "2025-09-20" }   # tolerated for frontend convenience
    """
    inst = session.get(Instrument, instrument_id)
    if not inst:
        raise HTTPException(404, "Instrument not found")
    if not (inst.data_source == "manual" and inst.owner_user_id == user.id):
        raise HTTPException(403, "You can only add manual prices to your manual instruments")

    if isinstance(payload, dict):
        price = payload.get("price", payload.get("close"))
        at = payload.get("at") or payload.get("date")
        if price is None:
            raise HTTPException(422, "price is required")
        try:
            close = float(price)
        except Exception:
            raise HTTPException(422, "Invalid price")
        if at:
            try:
                latest_at = datetime.fromisoformat(str(at).replace("Z", "+00:00"))
            except Exception:
                raise HTTPException(422, "Invalid timestamp (at/date)")
        else:
            latest_at = datetime.now(timezone.utc)
    else:
        close = float(payload.price)
        latest_at = payload.at or datetime.now(timezone.utc)

    ph = PriceHistory(
        instrument_id=instrument_id,
        price_date=latest_at.date(),
        close=close,
        source="manual",
        owner_user_id=user.id,   # keep price rows private too
    )
    inst.latest_price = close
    inst.latest_price_at = latest_at

    session.add(ph)
    session.add(inst)
    session.commit()
    session.refresh(ph)
    return ph


# ---------- hardened refresh endpoint ----------
@router.post("/refresh_all_prices")
def refresh_all_prices_endpoint(
    limit: int = Query(0, ge=0, description="Max instruments to refresh (0 = all)"),
    timeout_sec: int = Query(25, ge=1, le=55, description="Soft time budget in seconds"),
    session: Session = Depends(get_session),
):
    """
    Refresh Yahoo prices with a soft time budget to avoid proxy timeouts.
    Returns partial results if time budget is hit.
    """
    try:
        result = refresh_all_yahoo_prices(
            session,
            limit=limit,
            time_budget_sec=timeout_sec,
            logger=logger,
        )
        return result
    except Exception as e:
        logger.exception("refresh_all_prices failed")
        raise HTTPException(status_code=500, detail=f"refresh_all_prices failed: {e}")