from fastapi import APIRouter
from app.api.routes import health, lookups, instruments, activities, fx

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(lookups.router)
api_router.include_router(instruments.router)
api_router.include_router(activities.router)
api_router.include_router(fx.router, prefix="/fx", tags=["fx"])

