# app/core/tenant.py
from __future__ import annotations
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request
from sqlmodel import Session, select

from app.core.config import settings
from app.core.session import get_current_session
from app.api.deps import get_session
from app.models.user import User
from app.models.org import Organization, OrganizationMember  # SQLModel models

@dataclass
class TenantContext:
    user: User
    org: Organization
    mode: str  # "per_user" | "per_org"

def _resolve_personal_org(db: Session, user: User) -> Organization:
    """Get or create a personal org and membership for the user."""
    mem = db.exec(
        select(OrganizationMember).where(OrganizationMember.user_id == user.id)
    ).first()
    if mem:
        org = db.get(Organization, mem.org_id)
        if org:
            return org

    # No membership yet → create personal org & membership (idempotent-ish)
    # Try to reuse an org with same name if it already exists (avoid duplicates on quick double calls)
    personal_name = f"{user.email} (Personal)"
    org = db.exec(select(Organization).where(Organization.name == personal_name)).first()
    if not org:
        org = Organization(name=personal_name)
        db.add(org)
        db.commit()
        db.refresh(org)

    # Ensure membership row exists
    mem = db.exec(
        select(OrganizationMember).where(
            (OrganizationMember.user_id == user.id) & (OrganizationMember.org_id == org.id)
        )
    ).first()
    if not mem:
        mem = OrganizationMember(org_id=org.id, user_id=user.id, role="owner")
        db.add(mem)
        db.commit()

    return org

def get_tenant_ctx(
    request: Request,
    db: Session = Depends(get_session),
) -> TenantContext:
    # Cache per-request
    if hasattr(request.state, "tenant_ctx") and request.state.tenant_ctx:
        return request.state.tenant_ctx  # type: ignore[attr-defined]

    payload = get_current_session(request)
    if not payload:
        raise HTTPException(401, "Not authenticated")

    user = db.get(User, payload["uid"])
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid user")

    mode = getattr(settings, "TENANCY_MODE", "per_user").lower()
    if mode not in ("per_user", "per_org"):
        mode = "per_user"

    if mode == "per_user":
        org = _resolve_personal_org(db, user)
    else:
        # per_org requires at least one membership
        mem = db.exec(
            select(OrganizationMember).where(OrganizationMember.user_id == user.id)
        ).first()
        if not mem:
            raise HTTPException(403, "No organization membership")
        org = db.get(Organization, mem.org_id)
        if not org:
            raise HTTPException(403, "Organization not found")

    ctx = TenantContext(user=user, org=org, mode=mode)
    request.state.tenant_ctx = ctx  # cache
    return ctx