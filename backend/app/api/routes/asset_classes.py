from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..deps import get_session, get_current_user
from ...models.asset_class import AssetClass
from ...models.user import User
from ...schemas.asset_class import AssetClassCreate, AssetClassRead, AssetClassUpdate

router = APIRouter(prefix="/asset-classes", tags=["asset-classes"])

@router.get("", response_model=list[AssetClassRead])
def list_asset_classes(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(AssetClass).where(AssetClass.owner_user_id == user.id)
    ).all()

@router.post("", response_model=AssetClassRead, status_code=status.HTTP_201_CREATED)
def create_asset_class(
    payload: AssetClassCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = AssetClass(
        name=payload.name,
        owner_user_id=user.id,   
        org_id=None              
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.patch("{asset_class_id}", response_model=AssetClassRead)
def update_asset_class(
    asset_class_id: int,
    payload: AssetClassUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(AssetClass, asset_class_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Asset class not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.delete("{asset_class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset_class(
    asset_class_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(AssetClass, asset_class_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Asset class not found")

    session.delete(obj)
    session.commit()
    return None