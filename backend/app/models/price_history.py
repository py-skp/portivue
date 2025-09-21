# app/models/price_history.py
from __future__ import annotations
from typing import Optional
from datetime import date as dt_date
from sqlmodel import SQLModel, Field, UniqueConstraint

class PriceHistory(SQLModel, table=True):
    __tablename__ = "price_history"
    __table_args__ = (
        UniqueConstraint("instrument_id", "price_date", "org_id", "source", name="uq_price"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    instrument_id: int = Field(foreign_key="instrument.id", index=True)
    price_date: dt_date = Field(index=True)
    close: float
    source: str = Field(default="yahoo", index=True)

    # tenant column (NULL => public/global; non-NULL => per-org)
    org_id: Optional[int] = Field(default=None, index=True)