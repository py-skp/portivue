from __future__ import annotations
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import time
from sqlmodel import Session, select
from app.models.instrument import Instrument
from app.services.yf_client import fetch_profile_and_price

def refresh_all_yahoo_prices(
    session: Session,
    *,
    limit: int = 0,
    time_budget_sec: int = 25,
    logger: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Overwrite latest_price/latest_price_at for Yahoo instruments.
    Processes up to `limit` rows (0 = all) or until `time_budget_sec` is exceeded.
    Commits periodically. Returns counts and per-symbol errors.
    """
    q = select(Instrument).where(
        Instrument.data_source == "yahoo",
        Instrument.symbol.is_not(None),
    ).order_by(Instrument.id.asc())
    if limit and limit > 0:
        q = q.limit(limit)

    instruments = session.exec(q).all()

    updated = 0
    skipped = 0
    errors: list[str] = []
    processed = 0

    started = time.monotonic()

    for inst in instruments:
        processed += 1
        # stop if we’re about to exceed the proxy’s timeout
        if (time.monotonic() - started) >= time_budget_sec:
            break

        try:
            res = fetch_profile_and_price(inst.symbol or "")
            if not res:
                skipped += 1
                continue

            price = res.get("latest_price")
            ts = res.get("latest_price_at") or datetime.now(tz=timezone.utc)

            if price is None:
                skipped += 1
                continue

            inst.latest_price = float(price)
            inst.latest_price_at = ts

            # backfill metadata if missing
            inst.currency_code = inst.currency_code or res.get("currency_code") or inst.currency_code
            inst.asset_class = inst.asset_class or res.get("asset_class") or inst.asset_class
            inst.asset_subclass = inst.asset_subclass or res.get("asset_subclass") or inst.asset_subclass
            inst.name = inst.name or res.get("name") or inst.name

            updated += 1

            # commit periodically to keep the txn small
            if (processed % 25) == 0:
                session.commit()

        except Exception as e:
            msg = f"{inst.symbol or inst.id}: {e}"
            errors.append(msg)
            if logger:
                logger.exception(msg)

    session.commit()

    total = len(instruments)
    elapsed = time.monotonic() - started
    partial = (updated + skipped) < total  # stopped early due to budget/limit

    return {
        "total_considered": total,
        "processed": updated + skipped,
        "updated": updated,
        "skipped": skipped,
        "partial": partial,
        "elapsed_sec": round(elapsed, 2),
        "errors": errors[:50],  # keep payload modest
    }