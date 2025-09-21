from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..deps import get_session, get_current_user
from ...models.settings import AppSetting
from ...models.currency import Currency
from ...models.user import User

router = APIRouter(prefix="/settings", tags=["settings"])

def _get_or_create_user_settings(session: Session, user: User) -> AppSetting:
    s = session.exec(
        select(AppSetting).where(AppSetting.owner_user_id == user.id)
    ).first()
    if s:
        return s
    s = AppSetting(owner_user_id=user.id)  # org_id=None for now
    session.add(s)
    session.commit()
    session.refresh(s)
    return s

@router.get("", response_model=dict)
def get_settings(session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    s = _get_or_create_user_settings(session, user)
    return {"base_currency_code": s.base_currency_code}

@router.put("", response_model=dict, status_code=status.HTTP_200_OK)
def update_settings(payload: dict, session: Session = Depends(get_session), user: User = Depends(get_current_user)):
    base_code = (payload.get("base_currency_code") or "").upper().strip() or None

    if base_code and not session.get(Currency, base_code):
        raise HTTPException(status_code=400, detail="Unknown currency_code")

    s = _get_or_create_user_settings(session, user)
    s.base_currency_code = base_code
    session.add(s)
    session.commit()
    session.refresh(s)
    return {"base_currency_code": s.base_currency_code}