# app/models/account_movement.py
from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field

class AccountMovement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    as_of_date: date = Field(index=True)

    # Use plain string to match your SQLite schema (VARCHAR)
    # Allowed values in practice: "set_balance", "transfer"
    type: str = Field(index=True)

    note: Optional[str] = None

    from_account_id: Optional[int] = Field(default=None, foreign_key="account.id", index=True)
    to_account_id:   Optional[int] = Field(default=None, foreign_key="account.id", index=True)

    amount_input: float

    delta_from: Optional[float] = None  # in from-account currency
    delta_to:   Optional[float] = None  # in to-account currency

    from_currency: Optional[str] = None
    to_currency:   Optional[str] = None
    fx_rate_used:  Optional[float] = None         # source→target
    fx_source:     Optional[str] = None           # "auto" | "manual"