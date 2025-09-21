# app/models/user.py
from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablename__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    full_name: Optional[str] = None
    picture_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False

    # 2FA
    totp_enabled: bool = False
    totp_secret: Optional[str] = None       # store encrypted at-rest in prod

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)