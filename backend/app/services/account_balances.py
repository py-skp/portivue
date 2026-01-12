from __future__ import annotations
from datetime import date
from typing import List, Optional, Dict, Any

from sqlmodel import Session, select

from app.models.account import Account
from app.core.base_currency import get_base_currency_code   # used elsewhere
from app.services.fx_resolver import fx_rate_on


def compute_account_balances(
    session: Session,
    *,
    user_id: int,                               # 👈 required: scope all queries
    base_ccy_override: Optional[str] = None,
    on: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """
    One row per *this user's* account with balance in account CCY and base CCY.
    Base comes from per-user settings (or override). FX picked as-of `on` (default: today).
    """
    on = on or date.today()

    # Resolve base currency (prefer override; else per-user setting; fallback "USD")
    if base_ccy_override:
        base_ccy = base_ccy_override.upper()
    else:
        # Fetch the user object to pass to get_base_currency_code
        from app.models.user import User
        user_obj = session.get(User, user_id)
        base_ccy = get_base_currency_code(session, user=user_obj)
        base_ccy = base_ccy or "USD"

    # 🔒 only this user's accounts
    accounts = session.exec(
        select(Account).where(Account.owner_user_id == user_id)
    ).all()

    out: List[Dict[str, Any]] = []
    for a in accounts:
        bal_ccy = float(a.balance or 0.0)
        acct_ccy = a.currency_code

        # acct_ccy → base_ccy (None if same-ccy or missing rate)
        rate = fx_rate_on(session, acct_ccy, base_ccy, on)
        bal_base = (bal_ccy * (rate if rate is not None else 1.0)) if acct_ccy == base_ccy else (
            (bal_ccy * rate) if (rate is not None) else 0.0
        )

        out.append({
            "account_id": a.id,
            "account_name": a.name,
            "account_type": getattr(a, "type", None),
            "account_currency": acct_ccy,
            "balance_ccy": bal_ccy,
            "balance_base": bal_base,
            "fx_rate": (1.0 if acct_ccy == base_ccy else rate),
            "as_of": str(on),
            "base_currency": base_ccy,
        })

    # Stable ordering for UI
    out.sort(key=lambda r: (str(r["account_name"]).lower(), r["account_id"]))
    return out