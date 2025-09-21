# app/models/activity.py
from __future__ import annotations
from typing import Optional
from datetime import date
from sqlmodel import SQLModel, Field
from app.models.tenant_mixin import TenantFields

class Activity(TenantFields, SQLModel, table=True):
    __tablename__ = "activity"

    id: Optional[int] = Field(default=None, primary_key=True)

    owner_user_id: int = Field(foreign_key="user.id", index=True)  # 👈 add this

    # "Buy" | "Sell" | "Dividend" | "Interest" | "Fee"
    type: str

    account_id: int = Field(foreign_key="account.id", index=True)

    # Allow NULL for non-instrument activities (cash fee/interest etc.)
    instrument_id: Optional[int] = Field(default=None, foreign_key="instrument.id", index=True)

    broker_id: Optional[int] = Field(default=None, foreign_key="broker.id", index=True)

    date: date
    quantity: Optional[float] = None
    unit_price: Optional[float] = None   # for non-trades = amount
    currency_code: str
    fee: Optional[float] = 0.0
    note: Optional[str] = None