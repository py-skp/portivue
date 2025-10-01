# app/core/config.py
from __future__ import annotations

from typing import List, Optional, Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    # --- App basics ---
    APP_NAME: str = "Finlytics"

    TENANCY_MODE: Literal["per_user", "per_org"] = "per_user"

    # --- Database (required) ---
    database_url: str = Field(..., alias="DATABASE_URL")

    # --- Frontend URL (auth redirects, CORS, etc.) ---
    FRONTEND_URL: str = Field(..., alias="FRONTEND_URL")

    # --- Sessions / Cookies ---
    SESSION_SECRET: str = Field(..., alias="SESSION_SECRET")
    SESSION_COOKIE_NAME: str = Field("finlytics_session", alias="SESSION_COOKIE_NAME")
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
        csv = None
        if hasattr(info, "data") and isinstance(info.data, dict):
            csv = info.data.get("CORS_ORIGINS_CSV")

        if csv:
            return [p.strip() for p in str(csv).split(",") if p.strip()]

        if isinstance(v, str):
            return [v]
        return v

    # Normalize postgres scheme
    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, v: str):
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v


settings = Settings()