from __future__ import annotations
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from app import models  # noqa: F401  <-- forces model modules to load tables

# --- YOUR imports ---
# Pull your settings (which reads .env)
from app.core.config import settings
# Import SQLModel metadata; this aggregates all @table models
from sqlmodel import SQLModel

# Alembic Config object
config = context.config



# Configure Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Tell Alembic which metadata to compare against
target_metadata = SQLModel.metadata

# Use the same DB URL as the app
def get_url() -> str:
    # settings.database_url should already be normalized
    return settings.database_url

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,            # detect column type changes
        compare_server_default=True,  # detect server default changes
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_url()

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
            render_as_batch="sqlite" in configuration["sqlalchemy.url"],  # helpful for SQLite
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()