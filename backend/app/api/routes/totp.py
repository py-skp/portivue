# app/api/routes/totp.py
from __future__ import annotations
import io, secrets, datetime
import pyotp, qrcode
from passlib.hash import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sqlmodel import Session, select

from app.core.config import settings
from app.api.deps import get_session
from app.core.session import (
    get_current_session,
    create_session_cookie,
    set_cookie,
    load_session_cookie,
)
from app.models.user import User
from app.models.recovery_code import RecoveryCode

router = APIRouter(prefix="/2fa", tags=["auth"])

def require_auth(request: Request, session: Session) -> User:
    payload = get_current_session(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Not logged in")
    user = session.get(User, payload["uid"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user

@router.post("/setup/start")
def setup_start(request: Request, session: Session = Depends(get_session)):
    user = require_auth(request, session)
    if user.totp_enabled and user.totp_secret:
        raise HTTPException(400, "2FA already enabled")

    secret = pyotp.random_base32()
    user.totp_secret = secret
    session.add(user)
    session.commit()

    issuer = settings.APP_NAME
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=issuer)
    return {"secret": secret, "otpauth_uri": uri}

@router.get("/setup/qr")
def setup_qr(request: Request, session: Session = Depends(get_session)):
    user = require_auth(request, session)
    if not user.totp_secret:
        raise HTTPException(400, "Start setup first")
    issuer = settings.APP_NAME
    uri = pyotp.totp.TOTP(user.totp_secret).provisioning_uri(name=user.email, issuer_name=issuer)
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@router.post("/setup/verify")
def setup_verify(
    code: str,
    request: Request,
    session: Session = Depends(get_session),
    remember: int | None = None,   # ← NEW: allow ?remember=1
):
    user = require_auth(request, session)
    if not user.totp_secret:
        raise HTTPException(400, "Start setup first")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(400, "Invalid code")

    user.totp_enabled = True
    session.add(user)
    session.commit()

    # generate 10 recovery codes (stored hashed)
    session.exec(select(RecoveryCode).where(RecoveryCode.user_id == user.id)).all()
    for _ in range(10):
        rc = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(10))
        session.add(RecoveryCode(user_id=user.id, code_hash=bcrypt.hash(rc)))
    session.commit()

    # mark session as 2fa_ok now, respect remember flag
    remember_days = settings.SESSION_REMEMBER_DAYS if str(remember).lower() in ("1", "true", "yes") else None
    cookie = create_session_cookie(user_id=user.id, twofa_ok=True, remember_days=remember_days)
    resp = JSONResponse({"ok": True})
    set_cookie(resp, cookie, remember_days=remember_days)
    return resp

@router.post("/verify")
def verify_login(
    code: str,
    request: Request,
    session: Session = Depends(get_session),
    remember: int | None = None,   # ← NEW: allow ?remember=1
):
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(401, "No session")

    payload = load_session_cookie(token)
    user = session.get(User, payload["uid"])
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(400, "2FA not enabled")

    totp = pyotp.TOTP(user.totp_secret)
    ok = totp.verify(code, valid_window=1)
    if not ok:
        # recovery codes fallback
        codes = session.exec(
            select(RecoveryCode).where(
                (RecoveryCode.user_id == user.id) & (RecoveryCode.used_at.is_(None))
            )
        ).all()
        used = False
        for rc in codes:
            if bcrypt.verify(code, rc.code_hash):
                rc.used_at = datetime.datetime.utcnow()
                session.add(rc)
                session.commit()
                used = True
                break
        if not used:
            raise HTTPException(400, "Invalid code")

    # elevate session to 2FA-ok, respect remember flag
    remember_days = settings.SESSION_REMEMBER_DAYS if str(remember).lower() in ("1", "true", "yes") else None
    cookie = create_session_cookie(user_id=user.id, twofa_ok=True, remember_days=remember_days)
    resp = JSONResponse({"ok": True})
    set_cookie(resp, cookie, remember_days=remember_days)
    return resp

@router.post("/disable")
def disable_2fa(request: Request, session: Session = Depends(get_session)):
    user = require_auth(request, session)
    user.totp_enabled = False
    user.totp_secret = None
    # delete all recovery codes
    for rc in session.exec(select(RecoveryCode).where(RecoveryCode.user_id == user.id)).all():
        session.delete(rc)
    session.add(user)
    session.commit()
    # keep the user logged in, but mark session as not 2fa-ok (or ok=True; your choice)
    cookie = create_session_cookie(user_id=user.id, twofa_ok=True)  # still ok for current session
    resp = JSONResponse({"ok": True})
    set_cookie(resp, cookie)
    return resp