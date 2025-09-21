# app/models/tenant_mixin.py
from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field

class TenantFields(SQLModel, table=False):
    """
    Lightweight multi-tenant fields.
    - org_id: indexed, NO FK so you can add an Organization model later without errors.
    - owner_user_id: FK to user.id so we can cheaply filter rows by the logged-in user.
    """
    org_id: Optional[int] = Field(default=None, index=True)
    owner_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)