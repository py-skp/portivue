# app/core/db.py
from __future__ import annotations
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# --- Engine ---
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
)

# --- Session factory (per-request in FastAPI) ---
SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    autocommit=False,
)

def get_session():
    """FastAPI dependency: yields a DB session per-request."""
    with SessionLocal() as session:
        yield session

def init_db() -> None:
    """
    Create tables if they don’t exist (dev).
    IMPORTANT: import all model modules BEFORE create_all so metadata is populated.
    """
    # Eagerly import models so SQLModel.metadata knows about every table:
    import app.models.user            # noqa: F401
    import app.models.broker          # noqa: F401
    import app.models.account         # noqa: F401
    import app.models.instrument      # noqa: F401
    import app.models.activities        # noqa: F401
    import app.models.price_history   # noqa: F401
    # If you split PriceHistory into its own file:
    try:
        import app.models.price_history  # noqa: F401
    except Exception:
        # If PriceHistory lives inside instrument.py, this import is optional.
        pass

    SQLModel.metadata.create_all(engine)