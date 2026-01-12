# tests/test_audit_logging.py
"""Tests for audit logging functionality."""
import pytest
from sqlmodel import Session, select
from fastapi.testclient import TestClient
from app.models.user import User
from app.models.account import Account
from app.models.activities import Activity
from app.core.audit_logger import (
    log_activity_created,
    log_account_created,
    log_account_deleted,
    log_login_attempt,
)


def test_activity_creation_logged(client: TestClient, session: Session, caplog):
    """Test that activity creation is logged."""
    # Create a test user
    user = User(email="test@example.com", full_name="Test User")
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Log activity creation
    log_activity_created(user.id, 123, "Buy", 1000.0)
    
    # Check that log entry was created
    assert "AUDIT" in caplog.text
    assert f"User {user.id}" in caplog.text
    assert "created activity" in caplog.text.lower()
    assert "123" in caplog.text


def test_account_creation_logged(client: TestClient, session: Session, caplog):
    """Test that account creation is logged."""
    # Create a test user
    user = User(email="test2@example.com", full_name="Test User 2")
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Log account creation
    log_account_created(user.id, 456, "Test Account")
    
    # Check that log entry was created
    assert "AUDIT" in caplog.text
    assert f"User {user.id}" in caplog.text
    assert "created" in caplog.text.lower()
    assert "account" in caplog.text.lower()


def test_account_deletion_logged(client: TestClient, session: Session, caplog):
    """Test that account deletion is logged."""
    # Create a test user
    user = User(email="test3@example.com", full_name="Test User 3")
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Log account deletion
    log_account_deleted(user.id, 789, "Deleted Account")
    
    # Check that log entry was created
    assert "AUDIT" in caplog.text
    assert f"User {user.id}" in caplog.text
    assert "delete" in caplog.text.lower()
    assert "account" in caplog.text.lower()


def test_login_attempt_logged(caplog):
    """Test that login attempts are logged."""
    # Log successful login
    log_login_attempt(100, "user@example.com", True, "192.168.1.1")
    
    assert "AUDIT" in caplog.text
    assert "login_success" in caplog.text.lower()
    assert "user@example.com" in caplog.text
    
    caplog.clear()
    
    # Log failed login
    log_login_attempt(None, "hacker@example.com", False, "10.0.0.1")
    
    assert "AUDIT" in caplog.text
    assert "login_failed" in caplog.text.lower()
    assert "hacker@example.com" in caplog.text


def test_audit_log_contains_required_fields(caplog):
    """Test that audit logs contain all required fields."""
    log_activity_created(1, 2, "Buy", 500.0)
    
    # Check for required fields in log
    log_text = caplog.text
    assert "user_id" in log_text.lower() or "User 1" in log_text
    assert "activity" in log_text.lower()
    assert "create" in log_text.lower()
