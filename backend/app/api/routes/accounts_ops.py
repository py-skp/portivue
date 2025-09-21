# app/api/routes/accounts_ops.py
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.account import Account
from app.models.account_movement import AccountMovement
from app.services.fx_resolver import fx_rate_on

router = APIRouter(prefix="/accounts", tags=["accounts"])

# ---------- Schemas ----------

class SetBalancePayload(BaseModel):
    balance: float = Field(..., description="New absolute balance in account currency")
    as_of: Optional[date] = Field(None)
    note: Optional[str] = None

class TransferPayload(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: float = Field(..., gt=0, description="Amount in source account currency")
    as_of: Optional[date] = Field(None)
    # Optional: override FX rate (source→target). If provided we use this.
    fx_rate_override: Optional[float] = Field(None, gt=0)
    note: Optional[str] = None

# ---------- Helpers ----------

def _get_account(session: Session, account_id: int) -> Account:
    acc = session.get(Account, account_id)
    if not acc:
        raise HTTPException(404, detail=f"Account {account_id} not found")
    return acc

# ---------- Endpoints ----------

@router.post("/{account_id}/set_balance")
def set_balance(
    account_id: int,
    payload: SetBalancePayload,
    session: Session = Depends(get_session),
):
    acc = _get_account(session, account_id)
    as_of = payload.as_of or date.today()

    old_bal = float(acc.balance or 0.0)
    new_bal = float(payload.balance)
    delta   = new_bal - old_bal

    acc.balance = new_bal
    session.add(acc)

    mv = AccountMovement(
        created_at=datetime.utcnow(),
        as_of_date=as_of,
        type="set_balance",
        note=payload.note,
        from_account_id=account_id,
        amount_input=new_bal,
        delta_from=delta,
        from_currency=acc.currency_code,
    )
    session.add(mv)

    session.commit()
    session.refresh(acc)
    session.refresh(mv)

    return {
        "account_id": acc.id,
        "account_name": acc.name,
        "currency": acc.currency_code,
        "old_balance": old_bal,
        "new_balance": new_bal,
        "delta": delta,
        "movement_id": mv.id,
        "as_of": as_of.isoformat(),
    }


@router.post("/transfer")
def transfer_between_accounts(
    payload: TransferPayload,
    session: Session = Depends(get_session),
):
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(400, detail="From and To accounts must be different")

    src = _get_account(session, payload.from_account_id)
    dst = _get_account(session, payload.to_account_id)

    as_of = payload.as_of or date.today()
    send  = float(payload.amount)

    # Source → Target FX
    if payload.fx_rate_override is not None:
        fx = float(payload.fx_rate_override)
        fx_source = "manual"
    else:
        fx = fx_rate_on(session, base=src.currency_code, quote=dst.currency_code, on=as_of)
        if fx is None:
            raise HTTPException(400, detail=f"No FX {src.currency_code}->{dst.currency_code} for {as_of}")
        fx_source = "auto"

    landed = send * fx

    # Apply
    src_new = float(src.balance or 0.0) - send
    dst_new = float(dst.balance or 0.0) + landed
    src.balance = src_new
    dst.balance = dst_new

    session.add(src)
    session.add(dst)

    mv = AccountMovement(
        created_at=datetime.utcnow(),
        as_of_date=as_of,
        type="transfer",
        note=payload.note,
        from_account_id=src.id,
        to_account_id=dst.id,
        amount_input=send,
        delta_from=-send,
        delta_to=landed,
        from_currency=src.currency_code,
        to_currency=dst.currency_code,
        fx_rate_used=fx,
        fx_source=fx_source,
    )
    session.add(mv)

    session.commit()
    session.refresh(src)
    session.refresh(dst)
    session.refresh(mv)

    return {
        "from": {
            "account_id": src.id,
            "currency": src.currency_code,
            "delta": -send,
            "new_balance": src_new,
        },
        "to": {
            "account_id": dst.id,
            "currency": dst.currency_code,
            "delta": landed,
            "new_balance": dst_new,
        },
        "fx": {
            "rate": fx,
            "source": fx_source,
        },
        "movement_id": mv.id,
        "as_of": as_of.isoformat(),
    }


@router.get("/movements")
def list_movements(
    account_id: Optional[int] = Query(None, description="Filter by account (either leg)"),
    limit: int = 100,
    session: Session = Depends(get_session),
) -> List[dict]:
    q = select(AccountMovement).order_by(AccountMovement.created_at.desc()).limit(limit)
    if account_id:
        q = q.where(
            (AccountMovement.from_account_id == account_id) |
            (AccountMovement.to_account_id == account_id)
        )
    rows = session.exec(q).all()
    out = []
    for m in rows:
        out.append({
            "id": m.id,
            "created_at": m.created_at.isoformat() + "Z",
            "as_of_date": m.as_of_date.isoformat(),
            "type": m.type,
            "note": m.note,
            "from_account_id": m.from_account_id,
            "to_account_id": m.to_account_id,
            "amount_input": m.amount_input,
            "delta_from": m.delta_from,
            "delta_to": m.delta_to,
            "from_currency": m.from_currency,
            "to_currency": m.to_currency,
            "fx_rate_used": m.fx_rate_used,
            "fx_source": m.fx_source,
        })
    return out