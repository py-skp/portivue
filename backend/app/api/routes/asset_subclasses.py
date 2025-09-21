from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_session, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.asset_subclass import AssetSubclass

router = APIRouter(prefix="/asset-subclasses", tags=["asset-subclasses"])

def tenant_pred(model, user: User):
    # Per-org first (if enabled & both have org_id)
    if settings.TENANCY_MODE == "per_org" and hasattr(model, "org_id") and getattr(user, "org_id", None):
        return model.org_id == user.org_id
    # Per-user (owner_user_id)
    if hasattr(model, "owner_user_id"):
        return model.owner_user_id == user.id
    # Legacy fallback (if some model still has user_id)
    if hasattr(model, "user_id"):
        return model.user_id == user.id
    return None

@router.get("", response_model=list[AssetSubclass])
def list_asset_subclasses(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stmt = select(AssetSubclass)
    pred = tenant_pred(AssetSubclass, user)
    if pred is not None:
        stmt = stmt.where(pred)
    return session.exec(stmt).all()

@router.post("", response_model=AssetSubclass, status_code=status.HTTP_201_CREATED)
def create_asset_subclass(
    payload: dict,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    obj = AssetSubclass(name=name)

    # Set tenant fields
    if settings.TENANCY_MODE == "per_org" and hasattr(AssetSubclass, "org_id") and getattr(user, "org_id", None):
        obj.org_id = user.org_id
    elif hasattr(AssetSubclass, "owner_user_id"):
        obj.owner_user_id = user.id
    elif hasattr(AssetSubclass, "user_id"):  # legacy
        obj.user_id = user.id

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj