# backend/migrations/env.py
from __future__ import annotations
import os, sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# --- Make sure we can import app.* ---
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import app settings and models
from app.core.config import settings
from sqlmodel import SQLModel
from app import models  # noqa: F401  <-- ensures all models are imported

# Alembic Config object
config = context.config

# Configure Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata: all SQLModel tables
target_metadata = SQLModel.metadata


# --- DB URL source ---
def get_url() -> str:
    # Prefer DATABASE_URL from settings, fallback to alembic.ini
    return (
        getattr(settings, "DATABASE_URL", None)
        or os.getenv("DATABASE_URL")
        or config.get_main_option("sqlalchemy.url")
    )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    if not url:
        raise RuntimeError("No DATABASE_URL provided for Alembic migrations")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    url = get_url()
    if not url:
        raise RuntimeError("No DATABASE_URL provided for Alembic migrations")

    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        future=True,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            render_as_batch="sqlite" in url,  # safe for SQLite migrations
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()