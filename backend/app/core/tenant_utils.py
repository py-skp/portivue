# app/core/tenant_utils.py
from typing import TypeVar, Iterable
from sqlmodel import Session, select
from app.core.config import settings
from app.core.tenant import TenantContext
from app.models.tenant_mixin import TenantFields

T = TypeVar("T", bound=TenantFields)

def stamp_new(row: T, ctx: TenantContext) -> T:
    row.org_id = ctx.org.id
    if settings.TENANCY_MODE == "per_user":
        row.owner_id = ctx.user.id
    return row

def where_tenant(model: type[T], ctx: TenantContext):
    # returns a SQLModel "where" expression matching the current tenant
    if settings.TENANCY_MODE == "per_user":
        return (model.org_id == ctx.org.id) & (model.owner_id == ctx.user.id)
    else:
        return (model.org_id == ctx.org.id)

def select_tenant(session: Session, model: type[T], ctx: TenantContext):
    return session.exec(select(model).where(where_tenant(model, ctx)))