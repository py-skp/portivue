# app/services/fx_resolver.py
from __future__ import annotations
from datetime import date
from typing import Optional, Dict, Tuple
from sqlmodel import Session, select
from app.models.fx import FxRate

Key = Tuple[str, str, date]

def _canon(code: str) -> str:
    """Preserve the special token 'GBp'; otherwise uppercase."""
    s = (code or "").strip()
    return "GBp" if s == "GBp" else s.upper()

def fx_rate_on(
    session: Session,
    base: str,
    quote: str,
    on: date,
    cache: Optional[Dict[Key, Optional[float]]] = None,
) -> Optional[float]:
    """
    Return FX rate base->quote as of (<=) 'on'.

    - Preserves 'GBp' semantics:
      GBp is pence; 1 GBP = 100 GBp.
      We derive GBp conversions via GBP:
        GBp->X = (GBP->X) / 100
        X->GBp = (X->GBP) * 100
        GBP->GBp = 100
        GBp->GBP = 0.01
    - Uses a small in-call cache if provided.
    """
    b = _canon(base)
    q = _canon(quote)

    if b == q:
        return 1.0

    # Direct pence/sterling transforms first (no DB hit)
    if b == "GBP" and q == "GBp":
        return 100.0
    if b == "GBp" and q == "GBP":
        return 0.01

    # Derive via GBP for any pair involving GBp
    if b == "GBp" and q != "GBP":
        # GBp->X = (GBP->X) / 100
        r = fx_rate_on(session, "GBP", q, on, cache)
        return None if r is None else r / 100.0

    if q == "GBp" and b != "GBP":
        # X->GBp = (X->GBP) * 100
        r = fx_rate_on(session, b, "GBP", on, cache)
        return None if r is None else r * 100.0

    # Regular lookup (GBP/EUR, USD/JPY, etc.)
    key = (b, q, on)
    if cache is not None and key in cache:
        return cache[key]

    stmt = (
        select(FxRate.rate)
        .where(FxRate.base == b)
        .where(FxRate.quote == q)
        .where(FxRate.as_of_date <= on)
        .order_by(FxRate.as_of_date.desc())
        .limit(1)
    )
    rate = session.exec(stmt).first()  # float | None

    if cache is not None:
        cache[key] = rate
    return rate