from __future__ import annotations
import os
from fastapi import APIRouter
from app.tasks.scheduler import LAST_RUN  # uses the same module memory

router = APIRouter()

@router.get("/_refresh_status")
def get_refresh_status():
    return {
        "prices": {"last_run": LAST_RUN.get("prices"), "next_run": None},
        "fx": {"last_run": LAST_RUN.get("fx"), "next_run": None},
        "provider": os.getenv("PRICE_REFRESH_PROVIDER", os.getenv("PRICE_PROVIDER", "auto")),
        "scheduler_enabled": True,
    }