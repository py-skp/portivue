# app/core/slowapi_config.py
from __future__ import annotations

import os
import logging
from typing import Optional

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def get_redis_url() -> Optional[str]:
    """Get Redis URL from environment, with fallback."""
    return os.getenv("REDIS_URL") or os.getenv("REDIS_URI")


def rate_limit_key_func(request: Request) -> str:
    """
    Generate rate limit key based on:
    1. User ID if authenticated (from session cookie)
    2. IP address as fallback
    """
    # Try to get user from session
    try:
        from app.core.session import get_current_session
        session = get_current_session(request)
        if session and session.get("uid"):
            return f"user:{session['uid']}"
    except Exception:
        pass
    
    # Fallback to IP address
    return get_remote_address(request)


def create_limiter() -> Limiter:
    """
    Create and configure the rate limiter.
    
    Uses Redis if available, otherwise falls back to in-memory storage.
    """
    redis_url = get_redis_url()
    
    if redis_url:
        logger.info(f"Rate limiter using Redis backend: {redis_url}")
        storage_uri = redis_url
    else:
        logger.warning("REDIS_URL not set, using in-memory rate limiting (not suitable for production)")
        storage_uri = "memory://"
    
    limiter = Limiter(
        key_func=rate_limit_key_func,
        storage_uri=storage_uri,
        default_limits=["1000/hour"],  # Global default
        headers_enabled=True,  # Add X-RateLimit-* headers
    )
    
    return limiter


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom error handler for rate limit exceeded.
    
    Returns a JSON response with retry-after header.
    """
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "retry_after": exc.detail,
        },
        headers={"Retry-After": str(exc.detail)},
    )


# Create singleton limiter instance
limiter = create_limiter()
