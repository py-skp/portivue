# tests/test_security_config.py
"""Tests for security configuration."""
import pytest
import os
from pydantic import ValidationError


def test_weak_session_secret_rejected():
    """Test that weak session secrets are rejected."""
    from app.core.config import Settings
    
    weak_secrets = [
        "short",  # Too short
        "dev-secret",  # Default value
        "admin123",  # Weak default
        "12345678901234567890123456789012",  # Sequential numbers
    ]
    
    for weak_secret in weak_secrets:
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                DATABASE_URL="postgresql://user:pass@localhost/db",
                FRONTEND_URL="http://localhost:3000",
                SESSION_SECRET=weak_secret,
            )
        
        error_msg = str(exc_info.value)
        assert "SESSION_SECRET" in error_msg, f"Should reject weak secret: {weak_secret}"


def test_strong_session_secret_accepted():
    """Test that strong session secrets are accepted."""
    from app.core.config import Settings
    
    strong_secret = "a" * 32 + "b" * 10  # 42 characters, not a default value
    
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@localhost/db",
        FRONTEND_URL="http://localhost:3000",
        SESSION_SECRET=strong_secret,
    )
    
    assert settings.SESSION_SECRET == strong_secret


def test_cors_origins_configuration():
    """Test CORS origins configuration."""
    from app.core.config import Settings
    
    # Test explicit origins
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@localhost/db",
        FRONTEND_URL="http://localhost:3000",
        SESSION_SECRET="a" * 32 + "strong-secret",
        CORS_ORIGINS=["https://example.com", "https://app.example.com"],
    )
    
    assert len(settings.CORS_ORIGINS) == 2
    assert "https://example.com" in settings.CORS_ORIGINS


def test_session_cookie_secure_flag():
    """Test that session cookies have secure flag in production."""
    from app.core.config import Settings
    
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@localhost/db",
        FRONTEND_URL="http://localhost:3000",
        SESSION_SECRET="a" * 32 + "strong-secret",
        SESSION_COOKIE_SECURE=True,
    )
    
    assert settings.SESSION_COOKIE_SECURE is True


def test_redis_url_configuration():
    """Test Redis URL configuration for rate limiting."""
    from app.core.config import Settings
    
    settings = Settings(
        DATABASE_URL="postgresql://user:pass@localhost/db",
        FRONTEND_URL="http://localhost:3000",
        SESSION_SECRET="a" * 32 + "strong-secret",
        REDIS_URL="redis://localhost:6379/0",
    )
    
    assert settings.REDIS_URL == "redis://localhost:6379/0"
