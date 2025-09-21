# app/api/routes/brokers.py
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, col

from ..deps import get_session, get_current_user
from ...models.broker import Broker
from ...models.user import User
from ...schemas.broker import BrokerCreate, BrokerRead, BrokerUpdate

router = APIRouter(prefix="/brokers", tags=["brokers"])

@router.get("", response_model=list[BrokerRead])
def list_brokers(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(Broker).where(Broker.owner_user_id == user.id)
    ).all()

@router.post("", response_model=BrokerRead, status_code=status.HTTP_201_CREATED)
def create_broker(
    payload: BrokerCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    # optional: prevent duplicates per user (case-insensitive). Use == for case-sensitive.
    dup = session.exec(
        select(Broker).where(
            (Broker.owner_user_id == user.id) & (col(Broker.name).ilike(name))
        )
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="Broker already exists")

    obj = Broker(name=name, owner_user_id=user.id)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.patch("/{broker_id}", response_model=BrokerRead)  # <-- fixed path
def update_broker(
    broker_id: int,
    payload: BrokerUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(Broker, broker_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Broker not found")

    if payload.name is not None:
        new_name = payload.name.strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="name is required")
        dup = session.exec(
            select(Broker).where(
                (Broker.owner_user_id == user.id)
                & (col(Broker.name).ilike(new_name))
                & (Broker.id != broker_id)
            )
        ).first()
        if dup:
            raise HTTPException(status_code=409, detail="Broker already exists")
        obj.name = new_name

    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj

@router.delete("/{broker_id}", status_code=status.HTTP_204_NO_CONTENT)  # <-- fixed path
def delete_broker(
    broker_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    obj = session.get(Broker, broker_id)
    if not obj or obj.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Broker not found")
    session.delete(obj)
    session.commit()
    return None