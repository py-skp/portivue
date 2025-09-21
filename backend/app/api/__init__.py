from fastapi import APIRouter
from app.api.routes import (
    health, activities, lookups, instruments, fx, portfolio,
    accounts_balances, accounts_ops, auth_google, totp
)

api_router = APIRouter()

# auth first
api_router.include_router(auth_google.router, prefix="/auth", tags=["auth"])
api_router.include_router(totp.router, prefix="", tags=["auth"])  # already has /2fa prefix

# business routes
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(lookups.router, prefix="/lookups", tags=["lookups"])
api_router.include_router(activities.router, prefix="/activities", tags=["activities"])
api_router.include_router(instruments.router, prefix="/instruments", tags=["instruments"])
api_router.include_router(fx.router, prefix="/fx", tags=["fx"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(accounts_balances.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(accounts_ops.router, prefix="/accounts", tags=["accounts"])