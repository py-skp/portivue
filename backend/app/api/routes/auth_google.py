# app/api/routes/auth_google.py
from __future__ import annotations
from urllib.parse import urlencode, quote

from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlmodel import Session, select
from authlib.integrations.starlette_client import OAuth

from ..deps import get_session
from ...core.session import (
    create_session_cookie,
    set_cookie,
    clear_cookie,
    load_session_cookie,
)
from ...core.config import settings
from ...models.user import User
from ...models.oauth_account import OAuthAccount

REMEMBER_TMP_COOKIE = "portivue_remember"
NEXT_TMP_COOKIE = "portivue_next"

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

def _sanitize_next(raw_next: str | None) -> str:
    # Only allow same-site paths like "/dashboard"; disallow "//host" or "http(s)://"
    if not raw_next:
        return "/"
    if raw_next.startswith("/") and not raw_next.startswith("//"):
        return raw_next
    return "/"

@router.get("/google/login")
async def google_login(request: Request):
    remember = request.query_params.get("remember", "0").lower() in {"1", "true", "yes"}
    next_path = _sanitize_next(request.query_params.get("next"))

    resp = RedirectResponse(url="/auth/google/_go")
    cookie_kwargs = dict(
        max_age=300,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
        domain=(settings.SESSION_COOKIE_DOMAIN or None),
    )
    resp.set_cookie(key=REMEMBER_TMP_COOKIE, value=("1" if remember else "0"), **cookie_kwargs)
    resp.set_cookie(key=NEXT_TMP_COOKIE, value=quote(next_path), **cookie_kwargs)
    return resp

@router.get("/google/_go")
async def google_go(request: Request):
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, session: Session = Depends(get_session)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return JSONResponse({"detail": "Unable to complete Google sign-in"}, status_code=400)

    userinfo = token.get("userinfo") or {}
    sub = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    if not (sub and email):
        return JSONResponse({"detail": "Missing Google profile"}, status_code=400)

    # Link or create user
    oa = session.exec(
        select(OAuthAccount).where(
            (OAuthAccount.provider == "google") & (OAuthAccount.provider_account_id == sub)
        )
    ).first()

    if oa:
        user = session.get(User, oa.user_id)
    else:
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            user = User(email=email, full_name=name, picture_url=picture)
            session.add(user)
            session.commit()
            session.refresh(user)
        oa = OAuthAccount(provider="google", provider_account_id=sub, user_id=user.id, email=email)
        session.add(oa)
        session.commit()

    remember = (request.cookies.get(REMEMBER_TMP_COOKIE, "0") == "1")
    next_path = _sanitize_next(request.cookies.get(NEXT_TMP_COOKIE))  # re-sanitize

    cookie = create_session_cookie(user_id=user.id, twofa_ok=(not user.totp_enabled))

    if user.totp_enabled:
        final_url = f"{settings.FRONTEND_URL or 'http://localhost:3000'}/2fa?{urlencode({'next': next_path})}"
    else:
        base = settings.FRONTEND_URL or "http://localhost:3000"
        final_url = f"{base}{next_path}"

    resp = RedirectResponse(url=final_url)

    set_cookie(resp, cookie, remember=remember)

    for k in (REMEMBER_TMP_COOKIE, NEXT_TMP_COOKIE):
        resp.delete_cookie(k, path="/", domain=(settings.SESSION_COOKIE_DOMAIN or None))

    return resp

@router.post("/logout")
def logout():
    resp = JSONResponse({"ok": True})
    clear_cookie(resp)
    return resp

@router.get("/me")
def me(request: Request, session_db: Session = Depends(get_session)):
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        return JSONResponse({"authenticated": False})

    try:
        payload = load_session_cookie(token)
    except Exception:
        return JSONResponse({"authenticated": False})

    user = session_db.get(User, payload["uid"])
    if not user or not user.is_active:
        return JSONResponse({"authenticated": False})

    return {
        "authenticated": True,
        "twofa_ok": bool(payload.get("2fa")),
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.full_name,
            "picture": user.picture_url,
            "totp_enabled": user.totp_enabled,
        },
    }