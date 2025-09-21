from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field

class OAuthAccount(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider: str = Field(index=True)        # "google"
    provider_account_id: str = Field(index=True)  # Google user id
    user_id: int = Field(foreign_key="user.id")
    email: Optional[str] = None