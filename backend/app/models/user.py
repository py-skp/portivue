from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class User(SQLModel, table=True):
    __tablename__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    full_name: Optional[str] = None
    picture_url: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False

    # NEW (nullable so Google-only users still work)
    hashed_password: Optional[str] = Field(default=None, nullable=True)

    # 2FA
    totp_enabled: bool = False
    totp_secret: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)