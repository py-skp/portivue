# app/api/routes/scheduler_status.py
from __future__ import annotations

import os
from datetime import timezone, datetime
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Request, Depends
from apscheduler.job import Job
from sqlmodel import Session

from app.core.db import get_session
from app.core.settings_svc import get_or_create_settings
from app.models.settings import AppSetting

router = APIRouter()


def _job_to_dict(job: Job) -> Dict[str, Any]:
    """Serialize an APScheduler job to a JSON-friendly dict."""
    return {
        "id": job.id,
        "next_run_time": (
            job.next_run_time.astimezone(timezone.utc).isoformat()
            if job.next_run_time
            else None
        ),
        "trigger": str(job.trigger),
    }


@router.get("/_scheduler_status")
def scheduler_status(request: Request, session: Session = Depends(get_session)):
    """
    Report scheduler status (enabled flag), configured provider, last-run timestamps,
    and upcoming jobs (with UTC next_run_time).
    """
    sched = getattr(request.app.state, "scheduler", None)

    jobs: List[Dict[str, Any]] = []
    if sched:
        for j in sched.get_jobs():
            jobs.append(_job_to_dict(j))

            jobs.append(_job_to_dict(j))

    # Read last-run timestamps from DB (preferred) or scheduler module
    try:
        from app.tasks.scheduler import LAST_RUN  # fallback
        
        # Default to in-memory fallback
        last_runs = {
            "prices": LAST_RUN.get("prices"),
            "fx": LAST_RUN.get("fx"),
        }
        
        # Override with DB persistence if available
        try:
            settings_row = get_or_create_settings(session)
            if settings_row.last_prices_refresh:
                last_runs["prices"] = settings_row.last_prices_refresh.replace(tzinfo=timezone.utc).isoformat()
            if settings_row.last_fx_refresh:
                last_runs["fx"] = settings_row.last_fx_refresh.replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            pass # DB read failed, stick to memory

    except Exception:
        last_runs = {"prices": None, "fx": None}

    provider = (
        os.getenv("PRICE_REFRESH_PROVIDER")
        or os.getenv("PRICE_PROVIDER")
        or "auto"
    )

    return {
        "enabled": bool(sched),
        "provider": provider,
        "last_runs": last_runs,
        "jobs": jobs,
    }


@router.post("/_refresh_prices_now")
def refresh_prices_now(
    request: Request,
    timeout_sec: int = 55,
    limit: int = 0,
):
    """
    Manually trigger a price refresh. Respects your configured provider.
    Query params:
      - timeout_sec: soft time budget (seconds)
      - limit: max instruments to process (0 = all)
    """
    try:
        from sqlalchemy.orm import sessionmaker
        from sqlmodel import Session
        from app.core.db import engine
        from app.services.price_refresher import refresh_all_prices
        from app.tasks.scheduler import LAST_RUN
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {e}")

    provider = (
        os.getenv("PRICE_REFRESH_PROVIDER")
        or os.getenv("PRICE_PROVIDER")
        or "auto"
    )

    SessionLocal = sessionmaker(
        bind=engine, class_=Session, autoflush=False, autocommit=False
    )

    try:
        with SessionLocal() as s:
            result = refresh_all_prices(
                s,
                limit=limit,
                time_budget_sec=timeout_sec,
                provider=provider,
                logger=None,
            )
            
            # Persist last run time
            settings_row = get_or_create_settings(s)
            settings_row.last_prices_refresh = datetime.now(timezone.utc)
            s.add(settings_row)
            s.commit()
            
        LAST_RUN["prices"] = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"refresh failed: {e}")

    return {"ok": True, "provider": provider, "result": result}