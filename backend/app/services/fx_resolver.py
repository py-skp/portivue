# app/services/fx_resolver.py
from __future__ import annotations
from datetime import date
from typing import Optional, Dict, Tuple
from sqlmodel import Session, select
from app.models.fx import FxRate

Key = Tuple[str, str, date]

def fx_rate_on(
    session: Session,
    base: str,
    quote: str,
    on: date,
    cache: Optional[Dict[Key, Optional[float]]] = None,
) -> Optional[float]:
    """
    Return FX rate base->quote as of (<=) 'on'. Uses a tiny in-request cache.
    Special handling for GBp via GBP (1 GBP = 100 GBp), but DB stores only 3-letter codes.
    """
    base = (base or "").upper()
    quote = (quote or "").upper()

    if base == quote:
        return 1.0

    # GBp normalization: derive via GBP
    if base == "GBP" and quote == "GBP":
        return 1.0
    if base == "GBP" and quote == "GBp":
        r = fx_rate_on(session, "GBP", "GBP", on, cache)
        return None if r is None else r * 100.0
    if base == "GBp" and quote == "GBP":
        r = fx_rate_on(session, "GBP", "GBP", on, cache)
        return None if r is None else r / 100.0
    if base == "GBp" and quote != "GBP":
        # GBp->X = (GBP->X) * 1/100
        r = fx_rate_on(session, "GBP", quote, on, cache)
        return None if r is None else r / 100.0
    if quote == "GBp" and base != "GBP":
        # X->GBp = (X->GBP) * 100
        r = fx_rate_on(session, base, "GBP", on, cache)
        return None if r is None else r * 100.0

    key = (base, quote, on)
    if cache is not None and key in cache:
        return cache[key]

    stmt = (
        select(FxRate.rate)
        .where(FxRate.base == base)
        .where(FxRate.quote == quote)
        .where(FxRate.as_of_date <= on)
        .order_by(FxRate.as_of_date.desc())
        .limit(1)
    )
    rate = session.exec(stmt).first()  # float | None

    if cache is not None:
        cache[key] = rate
    return rate