# # backend/app/models/sector.py
# from sqlmodel import SQLModel, Field

# class Sector(SQLModel, table=True):
#     id: int | None = Field(default=None, primary_key=True)
#     name: str

from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint
from app.models.tenant_mixin import TenantFields

class Sector(TenantFields, SQLModel, table=True):
    __tablename__ = "sector"
    __table_args__ = (
        UniqueConstraint("owner_user_id", "name", name="uq_sector_owner_name"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str