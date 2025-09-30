# app/api/routes/health.py  (or wherever your health/_scheduler_status lives)
from fastapi import APIRouter, Request
import os
from datetime import timezone as dt_tz
from app.tasks import scheduler as sched_mod  # to read LAST_RUN

router = APIRouter()

@router.get("/health")
def health():
    return {"ok": True}

@router.get("/_scheduler_status")
def scheduler_status(request: Request):
    sched = getattr(request.app.state, "scheduler", None)
    enabled = bool(sched)

    jobs = []
    if sched:
        for j in sched.get_jobs():
            jobs.append({
                "id": j.id,
                "next_run_time": (
                    j.next_run_time.astimezone(dt_tz.utc).isoformat()
                    if j.next_run_time else None
                ),
                "trigger": str(j.trigger),
            })

    provider = (
        os.getenv("PRICE_REFRESH_PROVIDER")
        or os.getenv("PRICE_PROVIDER")
        or "auto"
    )

    return {
        "enabled": enabled,
        "provider": provider,
        "last_runs": sched_mod.LAST_RUN,   # {"prices": "...", "fx": "..."}
        "jobs": jobs,
    }