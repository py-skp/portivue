from __future__ import annotations

from datetime import date, datetime, timezone
import math
import requests

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.fx import FxRate
from app.models.currency import Currency
from app.core.settings_svc import get_or_create_settings
from app.core.config import settings

# Mount under /fx so the frontend's /fx/... calls resolve
router = APIRouter(prefix="/fx", tags=["fx"])

OXR_APP_ID = settings.oxr_app_id


# ----------------- helpers -----------------

def _norm(code: str | None) -> str:
    if code is None:
        return ""
    s = str(code).strip()
    if s.startswith("(") and s.endswith(")"):
        s = s.strip("()")
        s = s.split(",")[0].strip().strip("'").strip('"')
    return s

def _upper(code: str) -> str:
    return _norm(code).upper()

def _pick_base_currency(session: Session, override: str | None = None) -> str:
    if override:
        return _upper(override)
    settings_row = get_or_create_settings(session)
    if settings_row.base_currency_code:
        return _upper(settings_row.base_currency_code)
    first = session.exec(select(Currency.code)).first()
    return _upper(first or "USD")

def _isfinite(x: float | None) -> bool:
    return x is not None and math.isfinite(x)

def _gbp_pence_from_gbp(rate_gbp: float | None) -> float | None:
    return None if rate_gbp is None else rate_gbp * 100.0

def _fetch_oxr_latest() -> tuple[dict[str, float], date]:
    if not OXR_APP_ID:
        raise HTTPException(status_code=500, detail="OXR_APP_ID not configured")
    url = f"https://openexchangerates.org/api/latest.json?app_id={OXR_APP_ID}"
    r = requests.get(url, timeout=15)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"OXR error {r.status_code}: {r.text[:200]}")
    data = r.json()
    ts = int(data.get("timestamp", 0))
    dt = datetime.fromtimestamp(ts, tz=timezone.utc).date()
    rates: dict[str, float] = data.get("rates") or {}
    rates["USD"] = 1.0
    return rates, dt

def _cross_rate(rates_usd: dict[str, float], base: str, quote: str) -> float | None:
    b = _upper(base) if base != "GBp" else "GBp"
    q = _upper(quote) if quote != "GBp" else "GBp"

    def usd_to(code: str) -> float | None:
        if code == "GBP":
            return rates_usd.get("GBP")
        if code == "GBp":
            g = rates_usd.get("GBP")
            return _gbp_pence_from_gbp(g)
        return rates_usd.get(code)

    if b == q:
        return 1.0

    u_to_q = usd_to(q)
    u_to_b = usd_to(b)
    if not (_isfinite(u_to_q) and _isfinite(u_to_b) and u_to_b):
        return None
    return float(u_to_q) / float(u_to_b)

def _fetch_oxr_historical(on: date) -> tuple[dict[str, float], date]:
    if not OXR_APP_ID:
        raise HTTPException(status_code=500, detail="OXR_APP_ID not configured")

    url = f"https://openexchangerates.org/api/historical/{on.isoformat()}.json"
    r = requests.get(url, params={"app_id": OXR_APP_ID}, timeout=15)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"OXR error {r.status_code}: {r.text[:200]}")

    data = r.json() or {}
    ts = data.get("timestamp")
    if isinstance(ts, (int, float)):
        as_of = datetime.fromtimestamp(int(ts), tz=timezone.utc).date()
    else:
        as_of = on

    rates: dict[str, float] = data.get("rates") or {}
    rates["USD"] = 1.0
    return rates, as_of


# ----------------- routes -----------------

@router.get("/latest")
def fx_latest(
    base: str = Query(..., description="Base currency, e.g. USD / GBP / GBp"),
    quote: str = Query(..., description="Quote currency, e.g. EUR / USD / GBp"),
    on: date | None = None,
    session: Session = Depends(get_session),
):
    on = on or date.today()
    b = _upper(base) if base != "GBp" else "GBp"
    q = _upper(quote) if quote != "GBp" else "GBp"

    stmt = (
        select(FxRate)
        .where(FxRate.base == b)
        .where(FxRate.quote == q)
        .where(FxRate.as_of_date <= on)
        .order_by(FxRate.as_of_date.desc())
        .limit(1)
    )
    row = session.exec(stmt).first()
    if not row:
        return {"base": b, "quote": q, "as_of_date": str(on), "rate": None}
    return {"base": row.base, "quote": row.quote, "as_of_date": str(row.as_of_date), "rate": row.rate}


@router.post("/refresh")
def fx_refresh(
    base: str | None = Query(None, description="Optional ‘app base’ (informational). OXR remains USD-based."),
    session: Session = Depends(get_session),
):
    codes_rows = session.exec(select(Currency.code)).all()
    codes_db: list[str] = []
    for r in codes_rows:
        code = r[0] if isinstance(r, (tuple, list)) else (r.code if hasattr(r, "code") else r)
        code = _norm(code)
        if code:
            codes_db.append(code)
    codes_db = list(dict.fromkeys(codes_db))
    if not codes_db:
        return {"refreshed": 0, "message": "No currencies defined"}

    rates_usd, as_of = _fetch_oxr_latest()

    inserted = 0
    for b in codes_db:
        for q in codes_db:
            rate = _cross_rate(rates_usd, b, q)
            if not _isfinite(rate):
                continue

            existing = session.exec(
                select(FxRate).where(
                    FxRate.base == (b if b == "GBp" else _upper(b)),
                    FxRate.quote == (q if q == "GBp" else _upper(q)),
                    FxRate.as_of_date == as_of,
                )
            ).first()
            if existing:
                existing.rate = rate
            else:
                session.add(FxRate(
                    base=(b if b == "GBp" else _upper(b)),
                    quote=(q if q == "GBp" else _upper(q)),
                    as_of_date=as_of,
                    rate=rate,
                ))
            inserted += 1

    settings_row = get_or_create_settings(session)
    settings_row.last_fx_refresh = datetime.now(timezone.utc)
    session.add(settings_row)
    session.commit()
    return {"base": _pick_base_currency(session, base), "count": inserted, "date": str(as_of)}


@router.post("/fetch_for_date")
def fx_fetch_for_date(
    on: date = Query(..., description="The calendar date to fetch/store rates for (YYYY-MM-DD)"),
    session: Session = Depends(get_session),
):
    raw_rows = session.exec(select(Currency.code)).all()
    codes_db: list[str] = []
    for r in raw_rows:
        code = r[0] if isinstance(r, (tuple, list)) else (r.code if hasattr(r, "code") else r)
        code = _norm(code)
        if not code:
            continue
        if code == "GBp" or (len(code) == 3 and code.isalpha()):
            codes_db.append(code)

    codes_db = list(dict.fromkeys(codes_db))
    if not codes_db:
        return {"refreshed": 0, "message": "No currencies defined"}

    rates_usd, as_of = _fetch_oxr_historical(on)

    inserted = 0
    for b in codes_db:
        for q in codes_db:
            base_code = b if b == "GBp" else _upper(b)
            quote_code = q if q == "GBp" else _upper(q)

            rate = 1.0 if base_code == quote_code else _cross_rate(rates_usd, base_code, quote_code)
            if not _isfinite(rate):
                continue

            existing = session.exec(
                select(FxRate).where(
                    FxRate.base == base_code,
                    FxRate.quote == quote_code,
                    FxRate.as_of_date == as_of,
                )
            ).first()
            if existing:
                existing.rate = rate
            else:
                session.add(FxRate(base=base_code, quote=quote_code, as_of_date=as_of, rate=rate))
            inserted += 1

    session.commit()
    return {"date": str(as_of), "count": inserted}