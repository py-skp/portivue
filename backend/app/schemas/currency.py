from __future__ import annotations
from pydantic import BaseModel, Field

class CurrencyBase(BaseModel):
    code: str = Field(..., min_length=3, max_length=6)
    name: str

class CurrencyCreate(CurrencyBase):
    pass

class CurrencyUpdate(BaseModel):
    name: str | None = None

class CurrencyRead(CurrencyBase):
    pass