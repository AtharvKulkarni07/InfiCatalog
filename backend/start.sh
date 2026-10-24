#!/bin/sh
set -e

echo "==> [InfiCatalog] Running database migrations..."
python manage.py migrate --noinput

if [ "$SEED_DEMO_DATA" = "true" ]; then
    echo "==> [InfiCatalog] Seeding initial catalog data..."
    python manage.py seed_products
fi

echo "==> [InfiCatalog] Starting Gunicorn on port ${PORT:-8000} (workers: ${WEB_CONCURRENCY:-2})..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${WEB_CONCURRENCY:-2} \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -

