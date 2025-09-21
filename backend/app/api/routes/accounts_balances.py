# app/api/routes/accounts_balances.py
from __future__ import annotations
from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.db import get_session
from app.api.deps import get_current_user          # ← add
from app.models.user import User                    # ← add
from app.services.account_balances import compute_account_balances

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/balances")
def list_account_balances(
    base: Optional[str] = Query(None, description="Optional base currency override; defaults to settings"),
    on: Optional[date] = Query(None, description="Valuation date for FX (default: today)"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),         # ← require login
) -> List[dict]:
    return compute_account_balances(
        session,
        user_id=user.id,                             # ← scope
        base_ccy_override=base,
        on=on,
    )