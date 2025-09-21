# app/api/routes/portfolio.py
from __future__ import annotations
from typing import List, Optional, Any

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session


from app.core.db import get_session
from app.services.positions import compute_positions
from app.services.price_history import latest_price_for
from app.models.user import User
from app.api.deps import get_current_user  # 👈 add this

# --- Optional tenant support (fallback to None if module isn't present) ---
try:
    from app.core.tenant import get_tenant_ctx, TenantContext  # type: ignore
except Exception:
    TenantContext = Any  # type: ignore

    def get_tenant_ctx() -> None:  # fallback for single-tenant
        return None

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/closing")
def portfolio_closing(
    base: Optional[str] = Query(None, description="Optional base currency override; falls back to settings"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),          # 👈 current user
    ctx: TenantContext = Depends(get_tenant_ctx),    # 👈 optional tenant context
) -> List[dict]:
    return compute_positions(
        session,
        base_ccy_override=base,
        user=user,
        ctx=ctx,
    )

# NOTE: path is correct; don't repeat "/portfolio" because of the prefix above
@router.get("/{instrument_id}/latest_price")
def get_latest_price(
    instrument_id: int,
    db: Session = Depends(get_session),
    ctx: TenantContext = Depends(get_tenant_ctx),
):
    """
    Returns latest price for instrument, filtered by tenant if ctx is provided.
    If you haven't wired multi-tenant yet, ctx will be None and return global/latest.
    """
    price = latest_price_for(db, instrument_id, ctx)
    if not price:
        return {"instrument_id": instrument_id, "price": None}
    return {"instrument_id": instrument_id, "price": price.close, "date": price.price_date}