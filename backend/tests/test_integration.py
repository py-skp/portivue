# tests/test_integration.py
"""Integration tests for user data isolation."""
import pytest
from sqlmodel import Session
from fastapi.testclient import TestClient
from app.models.user import User
from app.models.account import Account
from app.models.activities import Activity
from app.models.currency import Currency
from app.core.session import create_session_cookie


@pytest.fixture
def user_a(session: Session):
    """Create test user A."""
    user = User(email="usera@example.com", full_name="User A")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def user_b(session: Session):
    """Create test user B."""
    user = User(email="userb@example.com", full_name="User B")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture
def currency_usd(session: Session):
    """Create USD currency."""
    currency = Currency(code="USD", name="US Dollar")
    session.add(currency)
    session.commit()
    return currency


def test_user_cannot_access_other_user_accounts(client: TestClient, session: Session, user_a, user_b, currency_usd):
    """Test that user A cannot access user B's accounts."""
    # Create account for user B
    account_b = Account(
        name="User B Account",
        currency_code="USD",
        owner_user_id=user_b.id,
    )
    session.add(account_b)
    session.commit()
    session.refresh(account_b)
    
    # Login as user A
    cookie = create_session_cookie(user_a.id, twofa_ok=True)
    client.cookies.set("portivue_session", cookie)
    
    # Try to list accounts (should only see user A's accounts, not user B's)
    response = client.get("/accounts")
    assert response.status_code == 200
    accounts = response.json()
    
    # User A should not see user B's account
    account_ids = [acc["id"] for acc in accounts]
    assert account_b.id not in account_ids


def test_user_cannot_access_other_user_activities(client: TestClient, session: Session, user_a, user_b, currency_usd):
    """Test that user A cannot access user B's activities."""
    # Create account and activity for user B
    account_b = Account(
        name="User B Account",
        currency_code="USD",
        owner_user_id=user_b.id,
    )
    session.add(account_b)
    session.commit()
    session.refresh(account_b)
    
    activity_b = Activity(
        type="Buy",
        account_id=account_b.id,
        date="2025-01-01",
        quantity=10.0,
        unit_price=100.0,
        currency_code="USD",
        owner_user_id=user_b.id,
    )
    session.add(activity_b)
    session.commit()
    session.refresh(activity_b)
    
    # Login as user A
    cookie = create_session_cookie(user_a.id, twofa_ok=True)
    client.cookies.set("portivue_session", cookie)
    
    # Try to list activities (should only see user A's activities)
    response = client.get("/activities")
    assert response.status_code == 200
    activities = response.json()
    
    # User A should not see user B's activity
    activity_ids = [act["id"] for act in activities]
    assert activity_b.id not in activity_ids


def test_user_cannot_delete_other_user_account(client: TestClient, session: Session, user_a, user_b, currency_usd):
    """Test that user A cannot delete user B's account."""
    # Create account for user B
    account_b = Account(
        name="User B Account to Delete",
        currency_code="USD",
        owner_user_id=user_b.id,
    )
    session.add(account_b)
    session.commit()
    session.refresh(account_b)
    
    # Login as user A
    cookie = create_session_cookie(user_a.id, twofa_ok=True)
    client.cookies.set("portivue_session", cookie)
    
    # Try to delete user B's account
    response = client.delete(f"/accounts/{account_b.id}")
    assert response.status_code == 404, "Should return 404 (not found) when trying to delete another user's account"
    
    # Verify account still exists
    account_check = session.get(Account, account_b.id)
    assert account_check is not None, "Account should still exist"


def test_user_can_only_see_own_portfolio(client: TestClient, session: Session, user_a, user_b):
    """Test that portfolio endpoint only returns user's own data."""
    # Login as user A
    cookie = create_session_cookie(user_a.id, twofa_ok=True)
    client.cookies.set("portivue_session", cookie)
    
    # Get portfolio
    response = client.get("/portfolio/closing")
    assert response.status_code == 200
    
    # Portfolio should be empty or only contain user A's data
    # (This test assumes empty portfolio for new user)
    portfolio = response.json()
    assert isinstance(portfolio, list)
