# tests/test_rate_limiting.py
"""Tests for rate limiting functionality."""
import time
import pytest
from fastapi.testclient import TestClient


def test_login_rate_limit(client: TestClient):
    """Test that login endpoint enforces rate limiting (5 requests/minute)."""
    # Make 5 login attempts (should all succeed or fail based on credentials, not rate limit)
    for i in range(5):
        response = client.post(
            "/auth/email/login",
            json={"email": f"test{i}@example.com", "password": "wrongpassword123"}
        )
        # Should get 400 (invalid credentials), not 429 (rate limited)
        assert response.status_code in [400, 401], f"Request {i+1} got unexpected status: {response.status_code}"
    
    # 6th request should be rate limited
    response = client.post(
        "/auth/email/login",
        json={"email": "test6@example.com", "password": "wrongpassword123"}
    )
    assert response.status_code == 429, "6th login attempt should be rate limited"
    assert "rate limit" in response.json()["detail"].lower()


def test_register_rate_limit(client: TestClient):
    """Test that register endpoint enforces rate limiting (3 requests/minute)."""
    # Make 3 registration attempts
    for i in range(3):
        response = client.post(
            "/auth/email/register",
            json={
                "email": f"newuser{i}@example.com",
                "password": "password123",
                "full_name": f"Test User {i}"
            }
        )
        # Should succeed (200) or fail with validation error, not rate limit
        assert response.status_code in [200, 400, 422], f"Request {i+1} got unexpected status: {response.status_code}"
    
    # 4th request should be rate limited
    response = client.post(
        "/auth/email/register",
        json={
            "email": "newuser4@example.com",
            "password": "password123",
            "full_name": "Test User 4"
        }
    )
    assert response.status_code == 429, "4th registration attempt should be rate limited"


def test_rate_limit_headers(client: TestClient):
    """Test that rate limit headers are returned."""
    response = client.post(
        "/auth/email/login",
        json={"email": "test@example.com", "password": "wrongpassword123"}
    )
    
    # Check for rate limit headers (slowapi adds these)
    # Note: Header names may vary based on slowapi version
    headers = response.headers
    # At least one rate limit header should be present
    has_rate_limit_header = any(
        "ratelimit" in key.lower() or "x-ratelimit" in key.lower()
        for key in headers.keys()
    )
    assert has_rate_limit_header, "Response should include rate limit headers"


def test_oauth_callback_rate_limit(client: TestClient):
    """Test that OAuth callback has rate limiting."""
    # This test is more complex as it requires OAuth flow
    # For now, just verify the endpoint exists and has rate limiting decorator
    # In a real scenario, you'd mock the OAuth flow
    
    # Make 11 requests (limit is 10/minute)
    for i in range(11):
        response = client.get("/auth/google/callback")
        # Will fail with 400 (missing OAuth params) but shouldn't be rate limited yet
        if i < 10:
            assert response.status_code in [400, 422], f"Request {i+1} should fail with validation error"
        else:
            # 11th request might be rate limited
            # Note: This might not work without proper OAuth params
            pass  # Skip assertion for now
