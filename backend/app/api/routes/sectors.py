# app/api/routes/sectors.py
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ..deps import get_session, get_current_user
from ...models.sector import Sector
from ...models.user import User
from ...schemas.sector import SectorCreate, SectorRead, SectorUpdate

router = APIRouter(prefix="/sectors", tags=["sectors"])

@router.get("", response_model=list[SectorRead])
def list_sectors(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(Sector).where(Sector.owner_user_id == user.id)
    ).all()

@router.post("", response_model=SectorRead, status_code=status.HTTP_201_CREATED)
def create_sector(
    payload: SectorCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = Sector(
        name=payload.name,
        owner_user_id=user.id,   # ✅ set the correct tenant column
        # org_id=None            # leave as-is unless you add orgs
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.patch("/{sector_id}", response_model=SectorRead)
def update_sector(
    sector_id: int,
    payload: SectorUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(Sector, sector_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Sector not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(obj, k, v)

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.delete("/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sector(
    sector_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(Sector, sector_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sector not found")

    session.delete(obj)
    session.commit()
    return None