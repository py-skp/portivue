from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class RecoveryCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    code_hash: str                      # store bcrypt hash of 10-char code
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)