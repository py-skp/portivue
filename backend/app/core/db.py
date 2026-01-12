# app/core/db.py
from __future__ import annotations

from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Session, create_engine, text

from app.core.config import settings

# --- Engine (sync) ---
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,          # Connection pool size
    max_overflow=20,       # Allow burst connections
    pool_recycle=3600,     # Recycle connections after 1 hour
    future=True,
)

# --- Session factory ---
SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    autocommit=False,
)


def get_session():
    """FastAPI dependency: yields a DB session per request."""
    with SessionLocal() as session:
        yield session


def init_db() -> None:
    """
    Create tables if they don’t exist (idempotent),
    then seed reference data like currencies.
    """
    # Import every module that defines SQLModel tables:
    import app.models.user          # noqa: F401
    import app.models.broker        # noqa: F401
    import app.models.account       # noqa: F401
    import app.models.instrument    # noqa: F401
    import app.models.activities    # noqa: F401
    import app.models.price_history # noqa: F401
    import app.models.currency      # noqa: F401

    # Creates missing tables only; safe to call every boot.
    SQLModel.metadata.create_all(engine)

    # --- Seed reference currencies ---
    currencies = [
        ("USD", "US Dollar"),
        ("EUR", "Euro"),
        ("GBP", "Pound Sterling"),
        ("GBp", "Sterling Pence"),
        ("AED", "UAE Dirham"),
        ("PKR", "Pak Rupee"),
        ("INR", "Indian Rupee"),
        ("JPY", "Japanese Yen"),
        ("CNY", "Chinese Yuan"),
        ("AUD", "Australian Dollar"),
    ]

    insert_sql = """
    INSERT INTO currency (code, name)
    VALUES (:code, :name)
    ON CONFLICT (code) DO NOTHING
    """

    with engine.begin() as conn:
        for code, name in currencies:
            conn.execute(text(insert_sql), {"code": code, "name": name})