from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from app.api.deps import get_session
from app.models.user import User
from app.core.session import create_session_cookie, set_cookie
from app.core.slowapi_config import limiter
from app.core.audit_logger import log_login_attempt

# ✅ use PBKDF2-SHA256 for new hashes; keep bcrypt_sha256 for legacy verify
from passlib.hash import pbkdf2_sha256, bcrypt_sha256

router = APIRouter(prefix="/auth/email", tags=["auth"])

def hash_password(pw: str) -> str:
    return pbkdf2_sha256.hash(pw)

def verify_password(pw: str, hashed: str) -> bool:
    # Try PBKDF2 first
    if pbkdf2_sha256.identify(hashed):
        return pbkdf2_sha256.verify(pw, hashed)
    # Fallback for any existing bcrypt_sha256 hashes
    if bcrypt_sha256.identify(hashed):
        return bcrypt_sha256.verify(pw, hashed)
    return False

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=4096)
    full_name: str | None = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=4096)

@limiter.limit("3/minute")
@router.post("/register")
def register(request: Request, body: RegisterIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if user:
        if not getattr(user, "hashed_password", None):
            user.hashed_password = hash_password(body.password)
            if body.full_name and not user.full_name:
                user.full_name = body.full_name
            session.add(user); session.commit()
        else:
            raise HTTPException(status_code=400, detail="Email already registered")
    else:
        user = User(
            email=body.email,
            full_name=body.full_name,
            hashed_password=hash_password(body.password),
        )
        session.add(user); session.commit()

    twofa_ok = not (user.totp_enabled and user.totp_secret)
    cookie = create_session_cookie(user_id=user.id, twofa_ok=twofa_ok)
    resp = JSONResponse({"ok": True, "twofa_required": not twofa_ok})
    set_cookie(resp, cookie)
    return resp

@limiter.limit("5/minute")
@router.post("/login")
def login(request: Request, body: LoginIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user or not user.is_active or not getattr(user, "hashed_password", None):
        log_login_attempt(None, body.email, False, request.client.host if request.client else None)
        raise HTTPException(status_code=400, detail="Invalid credentials")
    if not verify_password(body.password, user.hashed_password):
        log_login_attempt(user.id, body.email, False, request.client.host if request.client else None)
        raise HTTPException(status_code=400, detail="Invalid credentials")

    log_login_attempt(user.id, body.email, True, request.client.host if request.client else None)

    twofa_ok = not (user.totp_enabled and user.totp_secret)
    cookie = create_session_cookie(user_id=user.id, twofa_ok=twofa_ok)
    resp = JSONResponse({"ok": True, "twofa_required": not twofa_ok})
    set_cookie(resp, cookie)
    return resp