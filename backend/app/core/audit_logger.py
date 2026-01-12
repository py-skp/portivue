# app/core/audit_logger.py
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

logger = logging.getLogger("audit")


def log_audit_event(
    user_id: int,
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> None:
    """
    Log an audit event for security and compliance.
    
    Args:
        user_id: ID of the user performing the action
        action: Action performed (e.g., "create", "update", "delete", "login")
        resource_type: Type of resource (e.g., "activity", "account", "user")
        resource_id: ID of the resource affected (optional)
        details: Additional details about the action (optional)
        ip_address: IP address of the user (optional)
    """
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "ip_address": ip_address,
        "details": details or {},
    }
    
    # Use structured logging with extra fields
    logger.info(
        f"AUDIT: User {user_id} performed {action} on {resource_type} {resource_id or ''}",
        extra={"audit_event": event},
    )


def log_activity_created(user_id: int, activity_id: int, activity_type: str, amount: Optional[float] = None) -> None:
    """Log activity creation."""
    log_audit_event(
        user_id=user_id,
        action="create",
        resource_type="activity",
        resource_id=activity_id,
        details={"type": activity_type, "amount": amount},
    )


def log_activity_updated(user_id: int, activity_id: int, changes: Dict[str, Any]) -> None:
    """Log activity update."""
    log_audit_event(
        user_id=user_id,
        action="update",
        resource_type="activity",
        resource_id=activity_id,
        details={"changes": changes},
    )


def log_activity_deleted(user_id: int, activity_id: int) -> None:
    """Log activity deletion."""
    log_audit_event(
        user_id=user_id,
        action="delete",
        resource_type="activity",
        resource_id=activity_id,
    )


def log_account_created(user_id: int, account_id: int, account_name: str) -> None:
    """Log account creation."""
    log_audit_event(
        user_id=user_id,
        action="create",
        resource_type="account",
        resource_id=account_id,
        details={"name": account_name},
    )


def log_account_deleted(user_id: int, account_id: int, account_name: str) -> None:
    """Log account deletion."""
    log_audit_event(
        user_id=user_id,
        action="delete",
        resource_type="account",
        resource_id=account_id,
        details={"name": account_name},
    )


def log_login_attempt(user_id: Optional[int], email: str, success: bool, ip_address: Optional[str] = None) -> None:
    """Log login attempt."""
    log_audit_event(
        user_id=user_id or 0,  # Use 0 for failed attempts without user_id
        action="login_success" if success else "login_failed",
        resource_type="user",
        resource_id=user_id,
        details={"email": email},
        ip_address=ip_address,
    )
