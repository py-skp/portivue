# from datetime import date
# from typing import Literal, Optional
# from pydantic import BaseModel

# class ActivityCreate(BaseModel):
#     type: Literal["Buy", "Sell", "Dividend", "Interest", "Fee"]
#     account_id: int
#     instrument_id: int
#     date: date
#     quantity: Optional[float] = None
#     unit_price: Optional[float] = None
#     currency_code: str
#     fee: Optional[float] = 0.0
#     note: Optional[str] = None

# class ActivityRead(ActivityCreate):
#     id: int

from datetime import date
from typing import Literal, Optional
from sqlmodel import SQLModel, Field
from pydantic import BaseModel

class ActivityCreate(BaseModel):
    type: Literal["Buy", "Sell", "Dividend", "Interest", "Fee"]
    account_id: int
    instrument_id: int
    broker_id: Optional[int] = None 
    date: date
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    currency_code: str
    fee: Optional[float] = 0.0
    note: Optional[str] = None

class ActivityRead(ActivityCreate):
    id: int

# NEW: computed view that includes base-currency numbers
class ActivityReadWithCalc(ActivityRead):
    base_currency: str
    fx_rate: Optional[float]              # txn_ccy -> base on txn date
    gross_amount: float                   # qty*price (or |price| for non-trades) in txn ccy
    net_amount: float                     # gross +/- fee (Buy adds, Sell subtracts)
    gross_amount_base: Optional[float]    # converted using fx_rate (or None)
    net_amount_base: Optional[float]      # converted using fx_rate (or None)

class ActivityUpdate(SQLModel):
    type: Optional[str] = None
    account_id: Optional[int] = None
    instrument_id: Optional[int] = None
    broker_id: Optional[int | None] = None
    date: Optional[str] = None  # or date type if you use it
    quantity: Optional[float] = None
    unit_price: Optional[float] = None   # used as amount for Dividend/Interest/Fee
    currency_code: Optional[str] = None
    fee: Optional[float] = None
    note: Optional[str] = None