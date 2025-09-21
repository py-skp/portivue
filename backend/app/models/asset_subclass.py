from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint
from app.models.tenant_mixin import TenantFields

class AssetSubclass(TenantFields, SQLModel, table=True):
    __tablename__ = "asset_subclass"
    __table_args__ = (
        UniqueConstraint("owner_user_id", "name", name="uq_asset_subclass_owner_name"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str