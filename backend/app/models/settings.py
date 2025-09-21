# # app/models/settings.py
# from typing import Optional
# from sqlmodel import SQLModel, Field

# class AppSetting(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     base_currency_code: Optional[str] = Field(
#         default=None, foreign_key="currency.code", nullable=True
#     )

# from __future__ import annotations
# from typing import Optional
# from sqlmodel import SQLModel, Field

# from .tenant_mixin import TenantFields

# class AppSetting(TenantFields, SQLModel, table=True):
#     __tablename__ = "app_setting"
#     __table_args__ = (  # one row per user
#         {"sqlite_autoincrement": True},
#     )

#     id: Optional[int] = Field(default=None, primary_key=True)
#     # Keep currencies global → FK to global currency table
#     base_currency_code: Optional[str] = Field(
#         default=None, foreign_key="currency.code", nullable=True
#     )

from __future__ import annotations
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint
from app.models.tenant_mixin import TenantFields

class AppSetting(TenantFields, SQLModel, table=True):
    __tablename__ = "app_setting"
    __table_args__ = (
        # one settings row per user
        UniqueConstraint("owner_user_id", name="uq_app_setting_owner"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    base_currency_code: Optional[str] = Field(
        default=None, foreign_key="currency.code", nullable=True
    )