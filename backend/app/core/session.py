from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from itsdangerous import URLSafeSerializer, BadSignature
from fastapi import Request, HTTPException, Response

from app.core.config import settings

# ------------------------------------------------------------------
# Serializer (renamed salt to Portivue)
# ------------------------------------------------------------------
_s = URLSafeSerializer(settings.SESSION_SECRET, salt="portivue.session")

# ------------------------------------------------------------------
# Time helpers
# ------------------------------------------------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)

def _short_max_age() -> int:
    # seconds
    try:
        return int(getattr(settings, "SESSION_SHORT_MAX_AGE", 60 * 60 * 12))  # 12h default
    except Exception:
        return 60 * 60 * 12

def _remember_days_default() -> int:
    try:
        return int(getattr(settings, "SESSION_REMEMBER_DAYS", 14))  # 14 days default
    except Exception:
        return 14

# ------------------------------------------------------------------
# Env helpers (decide cookie attrs for dev vs prod)
# ------------------------------------------------------------------
def _is_localhost_dev() -> bool:
    fe = (getattr(settings, "FRONTEND_URL", "") or "").lower()
    if fe.startswith("http://localhost"):
        return True
    env = (getattr(settings, "ENV", "") or "").lower()
    return env in {"dev", "development", "local"}

def _cookie_kwargs(remember: bool) -> dict:
    """
    Compute safe cookie attributes depending on environment.
    In dev (localhost): host-only cookie, SameSite=Lax, Secure=False, no Domain.
    In prod: use settings as-is.
    """
    max_age = (
        int(getattr(settings, "SESSION_REMEMBER_DAYS", _remember_days_default())) * 24 * 3600
        if remember
        else int(getattr(settings, "SESSION_SHORT_MAX_AGE", _short_max_age()))
    )

    if _is_localhost_dev():
        return dict(
            httponly=True,
            secure=False,          # HTTP on localhost
            samesite="lax",
            path="/",
            domain=None,           # host-only cookie for localhost
            max_age=max_age,
        )

    # Production / non-localhost
    return dict(
        httponly=True,
        secure=bool(getattr(settings, "SESSION_COOKIE_SECURE", True)),
        samesite=str(getattr(settings, "SESSION_COOKIE_SAMESITE", "lax")).lower(),
        path="/",
        domain=(getattr(settings, "SESSION_COOKIE_DOMAIN", None) or None),
        max_age=max_age,
    )

# ------------------------------------------------------------------
# Token build/verify
# ------------------------------------------------------------------
def create_session_cookie(
    user_id: int,
    twofa_ok: bool,
    remember_days: int | None = None,
) -> str:
    """
    Build a signed session token with explicit exp (unix seconds).
    If remember_days is None/0, use short max-age (e.g., 12h).
    """
    now = _now()
    if remember_days and remember_days > 0:
        exp = now + timedelta(days=remember_days)
    else:
        exp = now + timedelta(seconds=_short_max_age())

    payload: Dict[str, Any] = {
        "uid": user_id,
        "2fa": bool(twofa_ok),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "ver": 1,
    }
    return _s.dumps(payload)

def load_session_cookie(token: str) -> dict:
    """
    Verify signature, then enforce our own exp.
    """
    try:
        payload = _s.loads(token)
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")

    exp = int(payload.get("exp", 0))
    if exp <= int(_now().timestamp()):
        raise HTTPException(status_code=401, detail="Session expired")
    return payload

# ------------------------------------------------------------------
# Cookie set/clear
# ------------------------------------------------------------------
def set_cookie(response: Response, value: str, remember: bool = False):
    """
    Set the session cookie with environment-appropriate attributes.
    """
    kwargs = _cookie_kwargs(remember=remember)
    response.set_cookie(
        key=getattr(settings, "SESSION_COOKIE_NAME", "pv_session"),
        value=value,
        **kwargs,
    )

def clear_cookie(response: Response) -> None:
    """
    Clear the session cookie (mirror attrs used when setting, where applicable).
    """
    # Use same env logic to ensure browser matches the cookie to delete
    if _is_localhost_dev():
        response.delete_cookie(
            key=getattr(settings, "SESSION_COOKIE_NAME", "pv_session"),
            path="/",
        )
    else:
        response.delete_cookie(
            key=getattr(settings, "SESSION_COOKIE_NAME", "pv_session"),
            path="/",
            domain=(getattr(settings, "SESSION_COOKIE_DOMAIN", None) or None),
        )

def get_current_session(request: Request) -> Optional[dict]:
    token = request.cookies.get(getattr(settings, "SESSION_COOKIE_NAME", "pv_session"))
    if not token:
        return None
    return load_session_cookie(token)