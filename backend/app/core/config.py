# app/core/config.py
from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App basics ---
    APP_NAME: str = "Portivue"

    TENANCY_MODE: Literal["per_user", "per_org"] = "per_user"

    # --- Database (required) ---
    database_url: str = Field(..., alias="DATABASE_URL")

    # --- Frontend URL (auth redirects, CORS, etc.) ---
    FRONTEND_URL: str = Field(..., alias="FRONTEND_URL")

    # --- Sessions / Cookies ---
    SESSION_SECRET: str = Field(..., alias="SESSION_SECRET")
    SESSION_COOKIE_NAME: str = Field("portivue_session", alias="SESSION_COOKIE_NAME")
    SESSION_COOKIE_SECURE: bool = Field(False, alias="SESSION_COOKIE_SECURE")
    SESSION_COOKIE_DOMAIN: Optional[str] = Field(None, alias="SESSION_COOKIE_DOMAIN")
    SESSION_COOKIE_SAMESITE: str = Field("lax", alias="SESSION_COOKIE_SAMESITE")

    # Session lifetimes
    SESSION_SHORT_MAX_AGE: int = Field(60 * 60 * 12, alias="SESSION_SHORT_MAX_AGE")  # 12h
    SESSION_REMEMBER_DAYS: int = Field(14, alias="SESSION_REMEMBER_DAYS")

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: Optional[str] = Field(None, alias="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(None, alias="GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: Optional[str] = Field(None, alias="GOOGLE_REDIRECT_URI")

    # --- CORS ---
    CORS_ORIGINS: List[str] = Field(default_factory=lambda: ["http://localhost:3000"], alias="CORS_ORIGINS")
    CORS_ORIGINS_CSV: Optional[str] = Field(None, alias="CORS_ORIGINS_CSV")
    CORS_ALLOW_CREDENTIALS: bool = Field(True, alias="CORS_ALLOW_CREDENTIALS")

    # --- Admin (legacy/dev) ---
    ADMIN_USER: str = Field("admin", alias="ADMIN_USER")
    ADMIN_PASS: str = Field("admin123", alias="ADMIN_PASS")
    ADMIN_SESSION_SECRET: str = Field("dev-secret", alias="ADMIN_SESSION_SECRET")

    # --- FX API ---
    oxr_app_id: Optional[str] = Field(default=None, alias="OXR_APP_ID")

    # --- Redis (for rate limiting and caching) ---
    REDIS_URL: Optional[str] = Field(default=None, alias="REDIS_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # Use model_validator to process CORS_ORIGINS_CSV after all fields are loaded
    @model_validator(mode="after")
    def _process_cors_csv(self):
        """Parse CORS_ORIGINS_CSV if provided and override CORS_ORIGINS."""
        if self.CORS_ORIGINS_CSV:
            origins = [p.strip() for p in self.CORS_ORIGINS_CSV.split(",") if p.strip()]
            print(f"DEBUG: Parsed CORS_ORIGINS_CSV '{self.CORS_ORIGINS_CSV}' into: {origins}")
            self.CORS_ORIGINS = origins
        return self

    # Normalize postgres scheme
    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, v: str):
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # Validate session secret strength
    @field_validator("SESSION_SECRET", mode="after")
    @classmethod
    def _validate_session_secret(cls, v: str):
        if len(v) < 32:
            raise ValueError("SESSION_SECRET must be at least 32 characters for security")
        
        # Check for common weak secrets
        weak_secrets = {
            "dev-secret", "admin123", "changeme", "secret", "password",
            "12345678901234567890123456789012",  # 32 chars of sequential numbers
        }
        if v.lower() in weak_secrets or v in weak_secrets:
            raise ValueError(
                "SESSION_SECRET cannot be a default or weak value. "
                "Generate a strong secret with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        
        return v


settings = Settings()