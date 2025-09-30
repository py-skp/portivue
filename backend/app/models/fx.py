# # app/models/fx.py
# from sqlmodel import SQLModel, Field
# from sqlalchemy import UniqueConstraint
# from datetime import date
# from typing import Optional

# class FxRate(SQLModel, table=True):
#     __tablename__ = "fx_rates"
#     __table_args__ = (UniqueConstraint("base","quote","as_of_date", name="uix_fx_rates_day"),)

#     id: Optional[int] = Field(default=None, primary_key=True)
#     base: str = Field(index=True)
#     quote: str = Field(index=True)
#     as_of_date: date = Field(index=True)
#     rate: float

    # app/models/fx.py
from sqlmodel import SQLModel, Field
from sqlalchemy import UniqueConstraint, Index, desc
from datetime import date as Date

class FxRate(SQLModel, table=True):
    __tablename__ = "fx_rates"

    id: int | None = Field(default=None, primary_key=True)
    base: str = Field(index=True)
    quote: str = Field(index=True)
    as_of_date: Date = Field(index=True)
    rate: float

    __table_args__ = (
        UniqueConstraint("base", "quote", "as_of_date", name="uq_fx_rates_day"),
        Index("ix_fx_rates_pair", "base", "quote"),
        Index("ix_fx_rates_pair_date_desc", "base", "quote", desc("as_of_date")),
    )