from datetime import date, datetime
from typing import Optional
from sqlmodel import SQLModel
from pydantic import BaseModel, Field

# --- create manual instrument ---
class InstrumentCreate(BaseModel):
    # symbol optional for manual instruments (real estate, PE, etc.)
    symbol: Optional[str] = None
    name: str
    sector: Optional[str] = None
    currency_code: str
    asset_class: Optional[str] = None
    asset_subclass: Optional[str] = None
    country: Optional[str] = None
    data_source: str = Field(default="manual")

class InstrumentRead(BaseModel):
    id: int
    symbol: Optional[str]
    name: str
    sector: Optional[str]
    currency_code: str
    asset_class: Optional[str]
    asset_subclass: Optional[str]
    country: Optional[str]
    latest_price: Optional[float]
    latest_price_at: Optional[datetime]
    data_source: str

    class Config:
        from_attributes = True  # pydantic v2

# --- update instrument ---
class InstrumentUpdate(SQLModel):
    symbol: Optional[str] = None
    name: Optional[str] = None
    sector: Optional[str] = None
    currency_code: Optional[str] = None
    asset_class: Optional[str] = None
    asset_subclass: Optional[str] = None
    country: Optional[str] = None

# --- manual price update ---
class PriceUpdate(BaseModel):
    date: date
    close: float

class PriceRead(BaseModel):
    id: int
    instrument_id: int
    price_date: date
    close: float
    source: str

    class Config:
        from_attributes = True