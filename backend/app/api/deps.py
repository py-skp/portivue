# app/api/deps.py
from typing import Generator, Optional
from fastapi import Depends, HTTPException, Request
from sqlmodel import Session
from app.core.db import engine
from app.core.session import get_current_session
from app.models.user import User

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

def get_current_user(
    request: Request,
    session: Session = Depends(get_session)
) -> User:
    payload = get_current_session(request)
    if not payload:
        raise HTTPException(401, "Not authenticated")
    user = session.get(User, payload["uid"])
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid user")
    return user

def get_current_user_2fa(
    request: Request,
    session: Session = Depends(get_session)
) -> User:
    """Require a logged-in user with 2FA already verified."""
    payload = get_current_session(request)
    if not payload:
        raise HTTPException(401, "Not authenticated")
    if not payload.get("2fa", False):
        raise HTTPException(403, "Two-factor verification required")
    user = session.get(User, payload["uid"])
    if not user or not user.is_active:
        raise HTTPException(401, "Invalid user")
    return user