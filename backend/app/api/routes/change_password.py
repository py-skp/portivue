"""
Password change endpoint for authenticated users.
Allows users to securely update their password by verifying their current password first.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlmodel import Session

from app.api.deps import get_session
from app.models.user import User
from app.core.session import get_current_session
from app.core.slowapi_config import limiter
from app.core.audit_logger import log_audit_event

# Import password utilities from auth_email
from app.api.routes.auth_email import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=4096)
    new_password: str = Field(min_length=8, max_length=128)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if len(password) > 128:
        return False, "Password must be less than 128 characters"
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    if not has_upper:
        return False, "Password must contain at least one uppercase letter"
    if not has_lower:
        return False, "Password must contain at least one lowercase letter"
    if not has_digit:
        return False, "Password must contain at least one number"
    if not has_special:
        return False, "Password must contain at least one special character"
    
    return True, ""


@limiter.limit("5/minute")
@router.post("/change-password")
def change_password(
    request: Request,
    body: ChangePasswordIn,
    session: Session = Depends(get_session)
):
    """
    Change password for authenticated user.
    Requires current password verification.
    """
    # Get current user from session
    payload = get_current_session(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user = session.get(User, payload["uid"])
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid user")
    
    # Verify user has a password (not OAuth-only user)
    if not user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="Cannot change password for OAuth-only accounts"
        )
    
    # Verify current password
    if not verify_password(body.current_password, user.hashed_password):
        log_audit_event(
            user_id=user.id,
            action="password_change_failed",
            resource_type="user",
            resource_id=user.id,
            details={"reason": "incorrect_current_password"},
            ip_address=request.client.host if request.client else None
        )
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Check if new password is same as current
    if verify_password(body.new_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from current password"
        )
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(body.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Update password
    user.hashed_password = hash_password(body.new_password)
    session.add(user)
    session.commit()
    
    # Log successful password change
    log_audit_event(
        user_id=user.id,
        action="password_changed",
        resource_type="user",
        resource_id=user.id,
        details={"success": True},
        ip_address=request.client.host if request.client else None
    )
    
    return JSONResponse({
        "ok": True,
        "message": "Password changed successfully"
    })
