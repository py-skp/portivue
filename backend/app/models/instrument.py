# app/models/instrument.py
from __future__ import annotations
from datetime import datetime, date as dt_date
from typing import Optional

from sqlmodel import SQLModel, Field, UniqueConstraint, Index
from app.models.tenant_mixin import TenantFields

class Instrument(TenantFields, SQLModel, table=True):
    __tablename__ = "instrument"
    __table_args__ = (
        # Make symbol unique per-tenant (org_id + symbol).
        # Allows NULL symbols (manual instruments) and avoids global unique collisions.
        UniqueConstraint("org_id", "symbol", name="uq_instrument_org_symbol"),
        # Performance indexes for common queries
        Index('ix_instrument_owner_source', 'owner_user_id', 'data_source'),
        Index('ix_instrument_symbol_source', 'symbol', 'data_source'),
    )

    id: Optional[int] = Field(default=None, primary_key=True)

    # Optional to support manual instruments
    symbol: Optional[str] = Field(default=None, index=True)
    name: str

    sector: Optional[str] = None
    currency_code: str
    asset_class: Optional[str] = None
    asset_subclass: Optional[str] = None
    country: Optional[str] = None

    latest_price: Optional[float] = None
    latest_price_at: Optional[datetime] = None

    data_source: str = Field(default="yahoo")  # "yahoo" | "manual"


# class PriceHistory(SQLModel, table=True):
#     __tablename__ = "price_history"
#     __table_args__ = (
#         # Prevent duplicates per tenant
#         UniqueConstraint("instrument_id", "price_date", "org_id", "source", name="uq_price"),
#     )

#     id: Optional[int] = Field(default=None, primary_key=True)

#     instrument_id: int = Field(foreign_key="instrument.id", index=True)
#     price_date: dt_date = Field(index=True)
#     close: float

#     # "yahoo", "manual", etc.
#     source: str = Field(default="yahoo", index=True)

#     # Tenant scoping (no FK to org to avoid “foreign key not defined” until you add Org model)
#     org_id: Optional[int] = Field(default=None, index=True)