#!/usr/bin/env sh
set -e

# Optional: wait for Postgres if running as a separate service
if [ -n "${DB_HOST}" ] && [ -n "${DB_PORT}" ]; then
  echo "Waiting for Postgres at ${DB_HOST}:${DB_PORT}..."
  for i in $(seq 1 60); do
    nc -z "${DB_HOST}" "${DB_PORT}" && break
    sleep 1
  done
  nc -z "${DB_HOST}" "${DB_PORT}" || { echo "Postgres not reachable"; exit 1; }
fi

# Skip Alembic – rely on init_db() to create tables on first boot
echo "Skipping migrations (init_db will handle table creation)."

# Hand off to CMD (uvicorn by default)
exec "$@"