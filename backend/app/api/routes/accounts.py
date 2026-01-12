# app/api/routes/accounts.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlmodel import Session, select

from ..deps import get_session, get_current_user
from ...models.account import Account, AccountType
from ...models.currency import Currency
from ...models.user import User
from ...schemas.account import AccountCreate, AccountRead, AccountUpdate
from ...core.audit_logger import log_account_created, log_account_deleted

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _parse_account_type(s: str) -> AccountType:
    """Accept either enum value ('Broker') or enum name ('broker')."""
    if not isinstance(s, str):
        raise ValueError("type must be a string")
    # value match (title-case values)
    for choice in AccountType:
        if s == choice.value:
            return choice
    # name match (case-insensitive, underscores)
    key = s.replace(" ", "_").lower()
    try:
        return AccountType[key]
    except KeyError:
        raise ValueError(f"Invalid account type: {s}")


@router.get("", response_model=list[AccountRead])
def list_accounts(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(Account).where(Account.owner_user_id == user.id)
    ).all()


@router.post("", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # currency must exist
    if not session.get(Currency, payload.currency_code):
        raise HTTPException(status_code=400, detail="Unknown currency_code")

    # parse/normalize type
    try:
        acc_type = _parse_account_type(payload.type)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # prevent duplicate account names per user (case-insensitive, equality)
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    dup = session.exec(
        select(Account)
        .where(
            (Account.owner_user_id == user.id)
            & (func.lower(Account.name) == name.lower())
        )
        .limit(1)
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="Account already exists")

    obj = Account(
        name=name,
        currency_code=payload.currency_code,
        type=acc_type,
        balance=payload.balance or 0.0,
        owner_user_id=user.id,  # ✅ tenancy
        # org_id can remain NULL until you enable orgs
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    
    # Audit log
    log_account_created(user.id, obj.id, obj.name)
    
    return obj


@router.patch("/{account_id}", response_model=AccountRead)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(Account, account_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")

    data = payload.dict(exclude_unset=True)

    # name change + duplicate guard
    if "name" in data and data["name"] is not None:
        new_name = data["name"].strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="name is required")
        dup = session.exec(
            select(Account).where(
                (Account.owner_user_id == user.id)
                & (func.lower(Account.name) == new_name.lower())
                & (Account.id != account_id)
            )
        ).first()
        if dup:
            raise HTTPException(status_code=409, detail="Account already exists")
        obj.name = new_name

    # type change
    if "type" in data and data["type"] is not None:
        try:
            obj.type = _parse_account_type(data["type"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # currency change
    if "currency_code" in data and data["currency_code"] is not None:
        if not session.get(Currency, data["currency_code"]):
            raise HTTPException(status_code=400, detail="Unknown currency_code")
        obj.currency_code = data["currency_code"]

    # balance change (nullable allowed)
    if "balance" in data:
        obj.balance = data["balance"]

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(Account, account_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Audit log before deletion
    log_account_deleted(user.id, obj.id, obj.name)
    
    session.delete(obj)
    session.commit()
    return None