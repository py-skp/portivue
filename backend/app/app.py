# app/app.py
from __future__ import annotations

import os
import sys
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import init_db
from app.tasks.scheduler import build_scheduler  # returns an APScheduler instance

# Routers
from app.api.routes.health import router as health_router
from app.api.routes.lookups import router as lookups_router
from app.api.routes.instruments import router as instruments_router
from app.api.routes.activities import router as activities_router
from app.api.routes.fx import router as fx_router
from app.api.routes.portfolio import router as portfolio_router
from app.api.routes.accounts_balances import router as accounts_balances_router
from app.api.routes.accounts_ops import router as accounts_ops_router
from app.api.routes.settings import router as settings_router
from app.api.routes.auth_google import router as auth_google_router
from app.api.routes.totp import router as totp_router
from app.api.routes.brokers import router as brokers_router
from app.api.routes.accounts import router as accounts_router
from app.api.routes.asset_classes import router as asset_classes_router
from app.api.routes.asset_subclasses import router as asset_subclasses_router
from app.api.routes.sectors import router as sectors_router
from app.api.routes.currencies import router as currencies_router
from app.api.routes.scheduler_status import router as scheduler_status_router
from app.api.routes.refresh_status import router as refresh_status_router
from app.api.routes.auth_email import router as auth_email_router

from app.admin.admin import mount_admin

# ---------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # 1) Ensure tables exist + seed reference data (idempotent)
    maybe_coro = init_db()
    if asyncio.iscoroutine(maybe_coro):
        await maybe_coro

    # 2) Start background scheduler (guarded + idempotent per-process)
    app.state.scheduler = None
    if os.getenv("SCHEDULER_ENABLED", "false").lower() in ("1", "true", "yes", "on"):
        try:
            sched = build_scheduler()
            sched.start()
            app.state.scheduler = sched
            log.info("Background scheduler started with jobs: %s", [str(j) for j in sched.get_jobs()])
        except Exception:
            log.exception("Failed to start background scheduler")

    # Hand over control to the app
    yield

    # Shutdown
    sched = getattr(app.state, "scheduler", None)
    if sched is not None:
        try:
            sched.shutdown(wait=False)
            log.info("Background scheduler shut down.")
        except Exception:
            log.exception("Error shutting down scheduler")


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
    app.router.redirect_slashes = False

    # CORS
    allow_origins = getattr(settings, "CORS_ORIGINS", ["*"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health_router)
    app.include_router(lookups_router)
    app.include_router(instruments_router)
    app.include_router(activities_router)
    app.include_router(fx_router)
    app.include_router(portfolio_router)
    app.include_router(accounts_balances_router)
    app.include_router(accounts_ops_router)
    app.include_router(brokers_router)
    app.include_router(accounts_router)
    app.include_router(asset_classes_router)
    app.include_router(asset_subclasses_router)
    app.include_router(sectors_router)
    app.include_router(currencies_router)
    app.include_router(settings_router)
    app.include_router(health_router)
    app.include_router(scheduler_status_router)
    app.include_router(refresh_status_router)
    app.include_router(auth_email_router)

    # Auth
    app.include_router(auth_google_router)
    app.include_router(totp_router)

    # Admin UI (don’t crash if misconfigured)
    try:
        mount_admin(app)
    except Exception as e:  # noqa: BLE001
        log.warning("Admin UI failed to mount: %s", e)

    log.info("FastAPI app created and routes mounted.")
    return app


app = create_app()