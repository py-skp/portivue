FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  PORT=8000 \
  WEB_CONCURRENCY=2 \
  WEB_THREADS=1 \
  GUNICORN_TIMEOUT=60

RUN apt-get update \
  && apt-get install -y --no-install-recommends gcc libpq-dev netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r app && useradd -r -g app -d /app app
WORKDIR /app
RUN chown app:app /app

# Install Python deps first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY . .

# Entrypoint (runs migrations / init; must end with exec "$@")
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# EXPOSE is largely informational; the CMD uses the ENV variable
USER app
ENTRYPOINT ["docker-entrypoint.sh"]

# Use shell so env vars expand; provide fallbacks
CMD sh -c "gunicorn app.app:app \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers ${WEB_CONCURRENCY:-2} \
  --threads ${WEB_THREADS:-1} \
  --worker-class uvicorn.workers.UvicornWorker \
  --timeout ${GUNICORN_TIMEOUT:-60} \
  --keep-alive 5 \
  --access-logfile - \
  --error-logfile -"