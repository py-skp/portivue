# app/services/price_refresher.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Any, Optional
import time

from sqlmodel import Session, select

from app.models.instrument import Instrument
from app.services.yf_client import fetch_latest_price_by_provider


def refresh_all_prices(
    session: Session,
    *,
    limit: int = 0,
    time_budget_sec: int = 25,
    provider: str = "auto",            # {"auto","alphavantage","stooq"}
    logger: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Refresh instrument prices using the selected provider.

    provider ∈ {"auto", "alphavantage", "stooq"} (default "auto").
    Processes up to `limit` rows (0 = all) or until `time_budget_sec` is exceeded.
    Commits periodically. Returns stats + errors.
    """
    # Only refresh PUBLIC Yahoo rows (shared instruments)
    q = (
        select(Instrument)
        .where(Instrument.data_source == "yahoo", Instrument.symbol.is_not(None))
        .order_by(Instrument.id.asc())
    )
    if limit and limit > 0:
        q = q.limit(limit)

    instruments = session.exec(q).all()

    updated = 0
    skipped = 0
    errors: list[str] = []
    processed = 0
    started = time.monotonic()

    if logger:
        logger.info(
            "[prices] refresh start: total=%d, limit=%s, budget=%ss, provider=%s",
            len(instruments), (limit or "ALL"), time_budget_sec, provider,
        )

    for inst in instruments:
        # Soft time budget
        if (time.monotonic() - started) >= time_budget_sec:
            if logger:
                logger.info("[prices] stopping early due to time budget (processed=%s)", processed)
            break

        processed += 1
        sym = (inst.symbol or "").strip().upper()
        if not sym:
            skipped += 1
            if logger:
                logger.warning("[prices] SKIPPED (no symbol) id=%s", inst.id)
            continue

        try:
            res = fetch_latest_price_by_provider(sym, provider=provider)
            if not res:
                skipped += 1
                if logger:
                    logger.warning("[prices] SKIPPED %s: no data from provider=%s", sym, provider)
                continue

            price = res.get("latest_price")
            ts = res.get("latest_price_at") or datetime.now(tz=timezone.utc)

            if price is None:
                skipped += 1
                if logger:
                    logger.warning("[prices] SKIPPED %s: missing price field from provider=%s", sym, provider)
                continue

            inst.latest_price = float(price)
            inst.latest_price_at = ts
            session.add(inst)
            updated += 1

            if logger:
                ts_s = ts.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S %Z")
                logger.info("[prices] UPDATED %-10s px=%s at=%s provider=%s", sym, price, ts_s, provider)

            # Periodic commit to keep transaction small
            if (processed % 25) == 0:
                session.commit()
                if logger:
                    logger.info("[prices] committed after %d instruments", processed)

        except Exception as e:
            msg = f"{sym or inst.id}: {e}"
            errors.append(msg)
            if logger:
                logger.exception("[prices] ERROR %s", sym)

    # Final commit
    session.commit()

    total = len(instruments)
    elapsed = time.monotonic() - started
    partial = (updated + skipped) < total

    result = {
        "provider": provider,
        "total_considered": total,
        "processed": updated + skipped,
        "updated": updated,
        "skipped": skipped,
        "partial": partial,
        "elapsed_sec": round(elapsed, 2),
        "errors": errors[:50],
    }

    if logger:
        # Don’t dump the errors array in the info log (keeps logs tidy)
        log_snapshot = {k: v for k, v in result.items() if k != "errors"}
        logger.info("[prices] refresh done: %s", log_snapshot)

    return result


# Backwards-compat alias (old imports still work)
refresh_all_yahoo_prices = refresh_all_prices