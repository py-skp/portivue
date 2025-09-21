# Import models here so metadata has all tables
from app.models.currency import Currency  # noqa
from app.models.asset_class import AssetClass  # noqa
from app.models.account import Account  # noqa
# from app.models.instrument import MarketInstrument  # noqa
from app.models.activities import Activity  # noqa
from app.models.settings import AppSetting  # <-- add this line
from app.models.fx import FxRate 
# app/models/base.py


from sqlmodel import SQLModel, create_engine

# Change to your actual DB URL
DATABASE_URL = "sqlite:///portfolio.db"   # or postgres://...

engine = create_engine(DATABASE_URL, echo=False)

def init_db() -> None:
    # import models inside the function to avoid circular imports
    from app.models import instrument, account, activity, asset_class, currency  # add others as needed
    SQLModel.metadata.create_all(engine)