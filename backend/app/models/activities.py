# app/models/activity.py
from __future__ import annotations
from typing import Optional
from datetime import date
from sqlmodel import SQLModel, Field, Index
from app.models.tenant_mixin import TenantFields

class Activity(TenantFields, SQLModel, table=True):
    __tablename__ = "activity"
    __table_args__ = (
        Index('ix_activity_owner_date', 'owner_user_id', 'date'),
        Index('ix_activity_owner_account', 'owner_user_id', 'account_id'),
        Index('ix_activity_owner_instrument', 'owner_user_id', 'instrument_id'),
    )

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
    
    # Tax fields
    withholding_tax: Optional[float] = 0.0  # WHT on dividends/interest
    capital_gains_tax: Optional[float] = 0.0  # CGT on sell transactions
    securities_transaction_tax: Optional[float] = 0.0  # STT on buy/sell
    stamp_duty: Optional[float] = 0.0  # Stamp duty on buy/sell
    
    note: Optional[str] = None