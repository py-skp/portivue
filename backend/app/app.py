# app/app.py
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import init_db

# Routers
from app.api.routes.health import router as health_router
from app.api.routes.lookups import router as lookups_router
from app.api.routes.instruments import router as instruments_router
from app.api.routes.activities import router as activities_router
from app.api.routes.fx import router as fx_router
from app.api.routes.portfolio import router as portfolio_router
from app.api.routes.accounts_balances import router as accounts_balances_router
from app.api.routes.accounts_ops import router as accounts_ops_router
from .api.routes.brokers import router as brokers_router
from .api.routes.accounts import router as accounts_router
from .api.routes.asset_classes import router as asset_classes_router
from .api.routes.asset_subclasses import router as asset_subclasses_router
from .api.routes.sectors import router as sectors_router
from .api.routes.currencies import router as currencies_router
from app.api.routes.settings import router as settings_router

# Auth
from app.api.routes.auth_google import router as auth_google_router
from app.api.routes.totp import router as totp_router

from app.admin.admin import mount_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB (supports sync or async init_db)
    maybe_coro = init_db()
    if asyncio.iscoroutine(maybe_coro):
        await maybe_coro
    yield
    # Shutdown: (optional) add cleanup here


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
    app.router.redirect_slashes = False

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=getattr(settings, "CORS_ORIGINS", ["*"]),
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

    # Auth
    app.include_router(auth_google_router)
    app.include_router(totp_router)

    # Admin UI
    mount_admin(app)

    return app


app = create_app()