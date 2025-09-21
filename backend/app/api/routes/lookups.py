# app/api/routes/lookups.py
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.api.deps import get_session, get_current_user
from app.models.user import User
from app.models.currency import Currency
from app.models.asset_class import AssetClass
from app.models.asset_subclass import AssetSubclass
from app.models.sector import Sector
from app.models.account import Account
from app.models.broker import Broker

router = APIRouter(prefix="/lookups", tags=["lookups"])

# ---------- global (shared) ----------
@router.get("/currencies")
def list_currencies(session: Session = Depends(get_session)):
    return session.exec(select(Currency)).all()

# ---------- user-specific ----------
@router.get("/asset-classes")
def list_asset_classes(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(AssetClass).where(AssetClass.owner_user_id == user.id)
    ).all()

@router.get("/asset-subclasses")
def list_asset_subclasses(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(AssetSubclass).where(AssetSubclass.owner_user_id == user.id)
    ).all()

@router.get("/sectors")
def list_sectors(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(Sector).where(Sector.owner_user_id == user.id)
    ).all()

@router.get("/accounts")
def list_accounts(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(Account).where(Account.owner_user_id == user.id)
    ).all()

@router.get("/brokers")
def list_brokers(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(Broker).where(Broker.owner_user_id == user.id)
    ).all()