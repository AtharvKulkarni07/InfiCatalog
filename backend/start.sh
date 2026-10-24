#!/bin/sh
set -e

echo "==> [InfiCatalog] Running database migrations..."
python manage.py migrate --noinput

if [ "$SEED_DEMO_DATA" = "true" ]; then
    echo "==> [InfiCatalog] Seeding initial catalog data..."
    python manage.py seed_products
fi

BIND_PORT="${PORT:-10000}"
echo "==> [InfiCatalog] Starting Gunicorn on port ${BIND_PORT} and 8000 (workers: ${WEB_CONCURRENCY:-2})..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${BIND_PORT} \
    --bind 0.0.0.0:8000 \
    --workers ${WEB_CONCURRENCY:-2} \
    --threads 4 \
    --worker-class gthread \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -

