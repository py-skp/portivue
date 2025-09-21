# app/core/base_currency.py
from typing import Optional
from sqlmodel import Session, select
from app.core.settings_svc import get_or_create_settings
from app.models.currency import Currency
from app.models.user import User

def get_base_currency_code(session: Session, *, user: Optional[User] = None) -> str:
    """
    Returns the user's base currency (falls back to global if user is None).
    """
    s = get_or_create_settings(session, user=user)
    if s.base_currency_code:
        return s.base_currency_code.upper()
    first = session.exec(select(Currency.code)).first()
    return (first or "USD").upper()