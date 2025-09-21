from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..deps import get_session, get_current_user  # require login; not admin-only
from ...models.currency import Currency
from ...schemas.currency import CurrencyCreate, CurrencyUpdate, CurrencyRead

router = APIRouter(prefix="/currencies", tags=["currencies"])

@router.get("", response_model=list[CurrencyRead])
def list_currencies(session: Session = Depends(get_session), _=Depends(get_current_user)):
    return session.exec(select(Currency)).all()

@router.post("", response_model=CurrencyRead, status_code=status.HTTP_201_CREATED)
def create_currency(payload: CurrencyCreate, session: Session = Depends(get_session), _=Depends(get_current_user)):
    code = payload.code.upper()
    if session.get(Currency, code):
        raise HTTPException(status_code=409, detail="Currency code already exists")
    obj = Currency(code=code, name=payload.name)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.patch("{code}", response_model=CurrencyRead)
def update_currency(code: str, payload: CurrencyUpdate, session: Session = Depends(get_session), _=Depends(get_current_user)):
    obj = session.get(Currency, code.upper())
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    if payload.name is not None:
        obj.name = payload.name
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.delete("{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_currency(code: str, session: Session = Depends(get_session), _=Depends(get_current_user)):
    obj = session.get(Currency, code.upper())
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return None