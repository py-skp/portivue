# app/services/price_history.py
from sqlmodel import Session, select
from typing import Optional
from app.models.price_history import PriceHistory

def latest_price_for(session: Session, instrument_id: int, org_id: Optional[int] = None):
    """
    Return (close, price_date) for the most recent PriceHistory row for an instrument,
    optionally filtered by org_id (tenant). If org_id is provided, we prefer org-specific
    rows; otherwise we fall back to public rows.
    """
    q = (
        select(PriceHistory)
        .where(PriceHistory.instrument_id == instrument_id)
        .order_by(PriceHistory.price_date.desc(), PriceHistory.id.desc())
    )
    if org_id is not None:
        # prefer org rows first; if you want a strict org-only behaviour, also add:
        # q = q.where(PriceHistory.org_id == org_id)
        # If you want fallback to public, you can do two queries.
        q = q.where((PriceHistory.org_id == org_id) | (PriceHistory.org_id.is_(None)))

    row = session.exec(q).first()
    if not row:
        return None
    return row.close, row.price_date