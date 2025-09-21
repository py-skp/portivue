# app/api/routes/activities.py
from typing import List, Tuple, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, case
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.activities import Activity
from app.models.broker import Broker
from app.models.account import Account
from app.models.user import User
from app.schemas.activities import ActivityCreate, ActivityReadWithCalc, ActivityUpdate
from app.core.base_currency import get_base_currency_code
from app.services.fx_resolver import fx_rate_on
from app.api.deps import get_current_user

router = APIRouter(prefix="/activities", tags=["activities"])


def _calc_amounts(act: Activity) -> Tuple[float, float]:
    qty = float(act.quantity or 0.0)
    px = float(act.unit_price or 0.0)
    fee = float(act.fee or 0.0)

    if act.type in ("Buy", "Sell"):
        gross = qty * px
        net = gross + fee if act.type == "Buy" else gross - fee
    else:
        gross = abs(px)
        net = gross
    return gross, net


def _as_read_with_calc(act: Activity, session: Session, user: User) -> ActivityReadWithCalc:
    base_ccy = get_base_currency_code(session, user=user)

    gross, net = _calc_amounts(act)
    rate: Optional[float] = fx_rate_on(session, act.currency_code, base_ccy, act.date)

    broker_name: Optional[str] = None
    if act.broker_id:
        b = session.get(Broker, act.broker_id)
        broker_name = b.name if b else None

    return ActivityReadWithCalc(
        id=act.id,
        type=act.type,
        account_id=act.account_id,
        instrument_id=act.instrument_id,
        date=act.date,
        quantity=act.quantity,
        unit_price=act.unit_price,
        currency_code=act.currency_code,
        fee=act.fee,
        note=act.note,
        broker_id=act.broker_id,
        broker_name=broker_name,
        base_currency=base_ccy,
        fx_rate=rate,
        gross_amount=gross,
        net_amount=net,
        gross_amount_base=(gross * rate) if rate is not None else None,
        net_amount_base=(net * rate) if rate is not None else None,
    )


# ---------- availability helper ----------

def _available_qty(
    session: Session,
    *,
    user_id: int,
    account_id: int,
    instrument_id: int,
    broker_id: Optional[int],
    as_of: Optional[date] = None,
    exclude_activity_id: Optional[int] = None,
) -> float:
    """
    Sum signed quantities (Buy +, Sell -) for this user/account/broker/instrument
    up to an optional date. Optionally exclude one activity (for updates).
    """
    qty_expr = func.sum(
        case(
            (Activity.type == "Buy", Activity.quantity),
            (Activity.type == "Sell", -Activity.quantity),
            else_=0.0,
        )
    )

    stmt = (
        select(func.coalesce(qty_expr, 0.0))
        .where(Activity.owner_user_id == user_id)
        .where(Activity.account_id == account_id)
        .where(Activity.instrument_id == instrument_id)
    )

    if broker_id is None:
        stmt = stmt.where(Activity.broker_id.is_(None))
    else:
        stmt = stmt.where(Activity.broker_id == broker_id)

    if as_of is not None:
        stmt = stmt.where(Activity.date <= as_of)

    if exclude_activity_id is not None:
        stmt = stmt.where(Activity.id != exclude_activity_id)

    result = session.exec(stmt).one()
    return float(result or 0.0)


# ---------- routes ----------

@router.get("", response_model=List[ActivityReadWithCalc])
def list_activities(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = (
        select(Activity)
        .where(Activity.owner_user_id == user.id)
        .order_by(Activity.date.desc(), Activity.id.desc())
    )
    rows = session.exec(stmt).all()
    return [_as_read_with_calc(a, session, user) for a in rows]


@router.post("", response_model=ActivityReadWithCalc, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: ActivityCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # ensure account belongs to user
    acc = session.get(Account, payload.account_id)
    if not acc or acc.owner_user_id != user.id:
        raise HTTPException(status_code=403, detail="Invalid account for this user")

    # 🔒 server-side guard: block oversell
    if payload.type == "Sell":
        available = _available_qty(
            session,
            user_id=user.id,
            account_id=payload.account_id,
            instrument_id=payload.instrument_id,
            broker_id=payload.broker_id,
            as_of=payload.date,
        )
        if float(payload.quantity or 0.0) > available + 1e-9:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient quantity to sell. Available: {available}",
            )

    act = Activity(**payload.model_dump(), owner_user_id=user.id)
    session.add(act)
    session.commit()
    session.refresh(act)
    return _as_read_with_calc(act, session, user)


@router.patch("/{activity_id}", response_model=ActivityReadWithCalc)
def update_activity(
    activity_id: int,
    payload: ActivityUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    act = session.get(Activity, activity_id)
    if not act or act.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Apply updates to a shallow copy to validate business rules
    new_type = payload.type or act.type
    new_account_id = payload.account_id or act.account_id
    new_instrument_id = payload.instrument_id or act.instrument_id
    new_broker_id = payload.broker_id if payload.broker_id is not None else act.broker_id
    new_date = payload.date or act.date
    new_qty = float(payload.quantity if payload.quantity is not None else (act.quantity or 0.0))

    if new_type == "Sell":
        available_excl = _available_qty(
            session,
            user_id=user.id,
            account_id=new_account_id,
            instrument_id=new_instrument_id,
            broker_id=new_broker_id,
            as_of=new_date,
            exclude_activity_id=activity_id,  # exclude current row when editing
        )
        if new_qty > available_excl + 1e-9:
            raise HTTPException(
                status_code=422,
                detail=f"Insufficient quantity to sell. Available: {available_excl}",
            )

    # Persist
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(act, k, v)

    session.add(act)
    session.commit()
    session.refresh(act)
    return _as_read_with_calc(act, session, user)


# ---------- OPTIONAL: tiny endpoint for UI to display availability ----------

@router.get("/positions/available", tags=["positions"])
def positions_available(
    account_id: int = Query(...),
    instrument_id: int = Query(...),
    broker_id: Optional[int] = Query(None),
    on: Optional[date] = Query(None, description="If provided, availability up to (and including) this date"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    qty = _available_qty(
        session,
        user_id=user.id,
        account_id=account_id,
        instrument_id=instrument_id,
        broker_id=broker_id,
        as_of=on,
    )
    return {"available_qty": qty}