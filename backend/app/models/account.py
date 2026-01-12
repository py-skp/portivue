from __future__ import annotations
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, Index
from sqlalchemy import UniqueConstraint
from app.models.tenant_mixin import TenantFields


class AccountType(str, Enum):
    current = "Current"
    savings = "Savings"
    fixed_deposit = "Fixed Deposit"
    investment = "Investment"
    broker = "Broker"
    other = "Other"


class Account(TenantFields, SQLModel, table=True):
    __tablename__ = "account"
    __table_args__ = (
        # prevent duplicate names per user
        UniqueConstraint("owner_user_id", "name", name="uq_account_owner_name"),
        # performance index for common queries
        Index('ix_account_owner_type', 'owner_user_id', 'type'),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str

    # keep FK if you have a Currency table
    currency_code: str = Field(foreign_key="currency.code", nullable=False)

    type: AccountType = Field(default=AccountType.other, index=True)

    # cached balance (optional)
    balance: Optional[float] = Field(default=None)