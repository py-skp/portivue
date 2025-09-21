# app/models/currency.py
from typing import Optional
from sqlmodel import SQLModel, Field

class Currency(SQLModel, table=True):
    code: str = Field(primary_key=True, index=True)  # e.g. "USD"
    name: Optional[str] = None                       # e.g. "US Dollar"