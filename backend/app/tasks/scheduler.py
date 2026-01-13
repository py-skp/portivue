# app/tasks/scheduler.py
from __future__ import annotations

import logging
import os
from contextlib import suppress
from datetime import datetime, timedelta, timezone as dt_tz

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import timezone

from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, select

from app.core.db import engine
from app.services.price_refresher import refresh_all_prices
from app.services.fx_client import fetch_frank_latest, cross_to_base, fetch_oxr_latest
from app.models.fx import FxRate
from app.core.config import settings

log = logging.getLogger(__name__)

# Last-run timestamps (UTC ISO strings) that the jobs update
LAST_RUN = {
    "prices": None,
    "fx": None,
}

SessionLocal = sessionmaker(bind=engine, class_=Session, autoflush=False, autocommit=False)


def _iso_now() -> str:
    return datetime.now(dt_tz.utc).isoformat()


# ---- Jobs --------------------------------------------------------------------

def job_refresh_prices():
    """
    Refresh instrument prices using the selected provider.
    Provider is read from env PRICE_REFRESH_PROVIDER (preferred) or PRICE_PROVIDER.
    """
    provider = (
        os.getenv("PRICE_REFRESH_PROVIDER")
        or os.getenv("PRICE_PROVIDER")
        or "auto"
    ).lower()

    time_budget = int(os.getenv("REFRESH_TIME_BUDGET_SEC", "25"))
    limit = int(os.getenv("REFRESH_LIMIT", "0"))  # 0 = all

    log.info(
        "[prices] refresh start: limit=%s, budget=%ss, provider=%s",
        "ALL" if limit == 0 else limit,
        time_budget,
        provider,
    )

    try:
        with SessionLocal() as s:
            res = refresh_all_prices(
                s,
                limit=limit,
                time_budget_sec=time_budget,
                provider=provider,
                logger=log,
            )
        # mark last-run only after attempt completes
        LAST_RUN["prices"] = datetime.now(dt_tz.utc).isoformat()
        log.info("[prices] provider=%s result=%s", provider, res)
    except Exception:
        log.exception("[prices] refresh failed")
        # still stamp last-run so the UI shows “attempted”
        LAST_RUN["prices"] = _iso_now()


def job_refresh_fx_rates():
    """Fetch latest FX rates. Priority: OXR (if key) -> Frankfurter (fallback)."""
    try:
        with SessionLocal() as s:
            # 1. Try OXR if configured
            if settings.oxr_app_id:
                try:
                    data = fetch_oxr_latest(settings.oxr_app_id)  # ranges: {"rates": {"EUR":...}, ...}
                    # OXR is USD-based
                    usd_rates = {k.upper(): float(v) for k, v in (data.get("rates") or {}).items()}
                    usd_rates["USD"] = 1.0
                    
                    # Log source
                    log.info("[fx] fetched from OXR (base USD)")

                    # We have USD rates directly.
                    # Convert to desired base if needed, but our helper cross_to_base expects EUR rates?
                    # No, cross_to_base is specific to EUR. We can implement a generic cross here.
                    # Actually, if we have USD rates, and we want "base" rates:
                    # rate(base->quote) = rate(base->USD) * rate(USD->quote)
                    # rate(base->USD) = 1 / rate(USD->base)
                    # So: rate(base->quote) = rate(USD->quote) / rate(USD->base)
                    
                    # Let's standardize on a map of {CODE: rate_per_USD} for the calculation below
                    # OXR gives {CODE: rate_per_USD} (how many CODE per 1 USD)
                    # e.g. EUR=0.9 -> 1 USD = 0.9 EUR
                    
                    rates_map_usd_base = usd_rates
                    # If Frankfurter (fallback) is used later, we get EUR-base, so we'd convert. 
                    
                except Exception as e:
                    log.warning("[fx] OXR configured but failed: %s. Falling back to Frankfurter.", e)
                    rates_map_usd_base = None
            else:
                rates_map_usd_base = None

            # 2. Fallback to Frankfurter
            if not rates_map_usd_base:
                data = fetch_frank_latest()
                if not data or "rates" not in data:
                    log.warning("Frankfurter latest: empty or error")
                    return
                
                # Frankfurter gives EUR-based rates: {USD: 1.1, GBP: 0.85} per 1 EUR
                eur_rates = {k.upper(): float(v) for k, v in (data.get("rates") or {}).items()}
                eur_rates["EUR"] = 1.0

                # Convert to USD-based map for consistent logic below
                # rate(USD->X) = rate(EUR->X) / rate(EUR->USD)
                rate_eur_usd = eur_rates.get("USD")
                if not rate_eur_usd:
                    log.error("Frankfurter missing USD rate, cannot normalize")
                    return
                
                rates_map_usd_base = {}
                for k, v in eur_rates.items():
                    rates_map_usd_base[k] = v / rate_eur_usd
                
                log.info("[fx] fetched from Frankfurter (base EUR -> norm to USD)")

            # 3. Upsert needed pairs
            # We now have rates_map_usd_base: {CODE: rate_per_USD}
            # Target: rate(BASE -> QUOTE) = rates_map_usd_base[QUOTE] / rates_map_usd_base[BASE]
            
            base_currency = os.getenv("APP_BASE_CURRENCY", "USD").upper()
            needed = set(
                os.getenv("FX_NEEDED_CODES", "USD,GBP,EUR,AED,PKR,INR")
                .upper()
                .split(",")
            )

            from datetime import date as Date
            # OXR timestamp vs Frankfurter date
            # OXR: "timestamp": 123
            # Frank: "date": "2025-..."
            # We'll valid_date = today or from payload. 
            # For simplicity, use UTC today as "as_of" for latest refresh
            as_of = datetime.now(dt_tz.utc).date()

            inserts = 0
            for q in needed:
                if q not in rates_map_usd_base:
                    continue
                
                # We want pairs like USD->GBP, GBP->USD, USD->EUR, etc.
                # Usually we want specific BASE -> QUOTE. 
                # The code originally only did BASE -> QUOTE for the defined 'needed' set? 
                # Original logic: cross_to_base(base, eur_rates) -> {quote: rate} where rate is 1 BASE = ? QUOTE
                
                # emulate cross_to_base logic:
                # rate(BASE -> q)
                val_q = rates_map_usd_base.get(q)
                val_base = rates_map_usd_base.get(base_currency)
                
                if not val_q or not val_base:
                    continue
                    
                # 1 BASE = (val_q / val_base) QUOTE
                rate_val = val_q / val_base

                # Upsert BASE -> q
                if q == base_currency:
                    continue

                exists = s.exec(
                    select(FxRate.id)
                    .where(FxRate.base == base_currency)
                    .where(FxRate.quote == q)
                    .where(FxRate.as_of_date == as_of)
                    .limit(1)
                ).first()
                
                if exists:
                    # Update? Original code didn't update "if exists: continue"
                    # We'll stick to skip if exists to avoid churn, or update? 
                    # If it's "latest", we might want to update.
                    # Original: "if exists: continue"
                    continue

                rate_obj = FxRate(base=base_currency, quote=q, as_of_date=as_of, rate=round(float(rate_val), 8))
                with suppress(Exception):
                    s.add(rate_obj)
                    inserts += 1

            try:
                if inserts:
                    s.commit()
            except Exception:
                s.rollback()
                log.exception("FX commit failed")
            else:
                if inserts:
                    log.info("FX upserted %s rows for %s", inserts, as_of)
    except Exception:
        log.exception("[fx] refresh failed")
    finally:
        LAST_RUN["fx"] = datetime.now(dt_tz.utc).isoformat()



# ---- Scheduler bootstrap -----------------------------------------------------

def _add_cron(sched: BackgroundScheduler, fn, cron_str: str, job_id: str, tz: str):
    """
    Accepts "M H D M W" cron strings. The timezone is supplied separately.
    """
    parts = cron_str.split()
    if len(parts) < 5:
        raise ValueError(f"Invalid cron '{cron_str}' for job {job_id}")

    minute, hour, day, month, dow = parts[:5]
    trigger = CronTrigger(
        minute=minute, hour=hour, day=day, month=month, day_of_week=dow,
        timezone=timezone(tz)
    )
    sched.add_job(
        fn,
        trigger,
        id=job_id,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=60 * 10,
    )


def build_scheduler() -> BackgroundScheduler:
    sched = BackgroundScheduler(timezone="UTC")

    # ----- quick-test overrides (optional) -----
    test_every = os.getenv("SCHEDULER_TEST_EVERY_MIN")  # e.g. "2" to run every 2 minutes
    run_on_start = os.getenv("SCHEDULER_RUN_ON_START", "0").lower() in ("1", "true", "yes")

    if test_every:
        n = test_every.strip()
        log.info("[sched] TEST MODE enabled: every %s min, run_on_start=%s", n, run_on_start)

        # Prices every N minutes
        trigger_prices = CronTrigger(minute=f"*/{n}", timezone=timezone("UTC"))
        sched.add_job(
            job_refresh_prices,
            trigger_prices,
            id="job_refresh_prices",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=600,
        )

        # FX every N minutes
        trigger_fx = CronTrigger(minute=f"*/{n}", timezone=timezone("UTC"))
        sched.add_job(
            job_refresh_fx_rates,
            trigger_fx,
            id="job_refresh_fx_rates",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=600,
        )

        if run_on_start:
            # Fire once shortly after startup (10s / 20s)
            sched.add_job(
                job_refresh_prices,
                trigger="date",
                run_date=datetime.now(dt_tz.utc) + timedelta(seconds=10),
                id="prices_warmup_once",
                replace_existing=True,
            )
            sched.add_job(
                job_refresh_fx_rates,
                trigger="date",
                run_date=datetime.now(dt_tz.utc) + timedelta(seconds=20),
                id="fx_warmup_once",
                replace_existing=True,
            )

        log.info("[sched] jobs configured: %s", [str(j) for j in sched.get_jobs()])
        return sched
    # ----- end quick-test overrides -----

    # --- Price refresh 4×/day (London & NY windows; Mon–Fri) ---
    pr1 = os.getenv("YF_REFRESH_CRON_1") or "0 10 * * 1-5"   # 10:00 Europe/London
    pr2 = os.getenv("YF_REFRESH_CRON_2") or "30 10 * * 1-5"  # 10:30 America/New_York
    pr3 = os.getenv("YF_REFRESH_CRON_3") or "30 17 * * 1-5"  # 17:30 Europe/London
    pr4 = os.getenv("YF_REFRESH_CRON_4") or "0 17 * * 1-5"   # 17:00 America/New_York

    _add_cron(sched, job_refresh_prices, pr1, "prices_london_open_plus1h", "Europe/London")
    _add_cron(sched, job_refresh_prices, pr3, "prices_london_close_plus1h", "Europe/London")
    _add_cron(sched, job_refresh_prices, pr2, "prices_nyse_open_plus1h", "America/New_York")
    _add_cron(sched, job_refresh_prices, pr4, "prices_nyse_close_plus1h", "America/New_York")

    # --- FX 2×/day ---
    fx1 = os.getenv("FX_REFRESH_CRON_1") or "0 10 * * 1-5"   # 10:00 Europe/London
    fx2 = os.getenv("FX_REFRESH_CRON_2") or "0 17 * * 1-5"   # 17:00 America/New_York

    _add_cron(sched, job_refresh_fx_rates, fx1, "fx_uk_open_plus1h", "Europe/London")
    _add_cron(sched, job_refresh_fx_rates, fx2, "fx_us_close_plus1h", "America/New_York")

    log.info("[sched] STANDARD MODE jobs: %s", [str(j) for j in sched.get_jobs()])
    return sched