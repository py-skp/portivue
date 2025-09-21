from __future__ import annotations
from pydantic import BaseModel, field_validator
from typing import Optional

# We accept either the enum "name" (current/savings/...) or the enum "value" (Current/Savings/...)
class AccountBase(BaseModel):
    name: str
    currency_code: str
    type: str              # e.g. "Broker" or "broker"
    balance: Optional[float] = 0.0

    @field_validator("currency_code")
    @classmethod
    def _upper_code(cls, v: str) -> str:
        return v.upper()

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None

class AccountRead(AccountBase):
    id: int