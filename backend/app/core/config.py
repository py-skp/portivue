# app/core/config.py
from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Finlytics"

    TENANCY_MODE: Literal["per_user", "per_org"] = "per_user"
    # per_user  → each user has a personal org, sees only their data (SaaS)
    # per_org   → users in the same org see the same data (enterprise)

    # --- Database (required) ---
    # Examples:
    #   DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/finlytics
    #   DATABASE_URL=sqlite:///./portfolio.db
    database_url: str = Field(..., alias="DATABASE_URL")

    # --- Frontend URL (used by auth redirects, CORS, etc.) ---
    FRONTEND_URL: str = "http://localhost:3000"

    # --- Sessions / Cookies ---
    SESSION_SECRET: str = Field("dev-session-secret", alias="SESSION_SECRET")
    SESSION_COOKIE_NAME: str = "finlytics_session"
    SESSION_COOKIE_SECURE: bool = False                 # True in production (HTTPS)
    SESSION_COOKIE_DOMAIN: Optional[str] = None         # e.g. ".yourdomain.com"
    SESSION_COOKIE_SAMESITE: str = "lax"                # "lax" | "strict" | "none"
    SESSION_COOKIE_DOMAIN: str | None = "localhost"   # 👈 add/ensure this in .env for dev

    # Session lifetimes
    SESSION_SHORT_MAX_AGE: int = 60 * 60 * 12           # 12 hours
    SESSION_REMEMBER_DAYS: int = 14                     # 14 days

    # --- Google OAuth (SSO) ---
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    # Must match the one registered in Google console
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    # --- CORS ---
    # You can also set CORS_ORIGINS as a JSON list in .env, e.g. '["http://localhost:3000"]'
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    # Or provide CSV via CORS_ORIGINS_CSV=http://a,http://b
    CORS_ORIGINS_CSV: Optional[str] = None
    CORS_ALLOW_CREDENTIALS: bool = True

    # --- Admin (legacy/dev) ---
    ADMIN_USER: str = "admin"
    ADMIN_PASS: str = "admin123"
    ADMIN_SESSION_SECRET: str = "dev-secret"

    # --- FX API (Open Exchange Rates) ---
    oxr_app_id: Optional[str] = Field(default=None, alias="OXR_APP_ID")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # Normalize CORS from CSV if provided
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _normalize_cors(cls, v, info):
        # If CSV helper provided, prefer that
        csv = None
        # Access sibling field value if already parsed
        if hasattr(info, "data") and isinstance(info.data, dict):
            csv = info.data.get("CORS_ORIGINS_CSV")
        # If running in pre-mode and env injection happens differently, also
        # handle the case where v is None but CORS_ORIGINS_CSV present in env.
        if not csv:
            # no-op; v might already be list/string from env/defaults
            pass

        if csv:
            parts = [p.strip() for p in str(csv).split(",") if p.strip()]
            return parts or (v if isinstance(v, list) else [v] if isinstance(v, str) else ["http://localhost:3000"])

        # If env provided a single string (not JSON array), coerce to list
        if isinstance(v, str):
            return [v]
        return v

    # Normalize common postgres scheme
    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, v: str):
        if isinstance(v, str) and v.startswith("postgres://"):
            # SQLAlchemy prefers postgresql:// or postgresql+psycopg://
            return v.replace("postgres://", "postgresql://", 1)
        return v


settings = Settings()