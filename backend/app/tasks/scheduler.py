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
from app.services.fx_client import fetch_frank_latest, cross_to_base
from app.models.fx import FxRate

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
    """Fetch Frankfurter latest EUR rates, cross to base, and upsert a small set."""
    try:
        with SessionLocal() as s:
            data = fetch_frank_latest()
            if not data or "rates" not in data:
                log.warning("Frankfurter latest: empty or error")
                return

            eur_rates = {k.upper(): float(v) for k, v in (data.get("rates") or {}).items()}
            eur_rates["EUR"] = 1.0

            base = os.getenv("APP_BASE_CURRENCY", "USD").upper()
            needed = set(
                os.getenv("FX_NEEDED_CODES", "USD,GBP,EUR,AED,PKR,INR")
                .upper()
                .split(",")
            )

            usd_rates = cross_to_base(base, eur_rates)  # -> {quote: rate}

            from datetime import date as Date
            as_of = Date.fromisoformat(data["date"])

            inserts = 0
            for q, r in usd_rates.items():
                if q == base or q not in needed:
                    continue

                exists = s.exec(
                    select(FxRate.id)
                    .where(FxRate.base == base)
                    .where(FxRate.quote == q)
                    .where(FxRate.as_of_date == as_of)
                    .limit(1)
                ).first()
                if exists:
                    continue

                rate = FxRate(base=base, quote=q, as_of_date=as_of, rate=round(float(r), 8))
                with suppress(Exception):
                    s.add(rate)
                    inserts += 1

            try:
                if inserts:
                    s.commit()
            except Exception:
                s.rollback()
                log.exception("FX commit failed")
            else:
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