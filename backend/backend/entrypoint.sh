#!/bin/sh
set -e

echo "Waiting for database..."
python << 'PY'
import os, time, sys
import psycopg

url = os.getenv("DATABASE_URL", "")
if not url:
    print("No DATABASE_URL set, skipping wait.")
    sys.exit(0)

for i in range(30):
    try:
        psycopg.connect(url, connect_timeout=2).close()
        print("Database is ready.")
        sys.exit(0)
    except Exception as e:
        print(f"  [{i+1}/30] Database not ready: {e}")
        time.sleep(2)
print("Database did not become ready in time.")
sys.exit(1)
PY

echo "Applying migrations..."
python manage.py migrate --noinput

echo "Ensuring admin user exists..."
python manage.py shell -c "
from accounts.models import User
u, created = User.objects.get_or_create(
    username='admin',
    defaults={'email': 'admin@sentinelx.local', 'role': 'ADMIN', 'is_staff': True, 'is_superuser': True}
)
u.role = 'ADMIN'; u.is_staff = True; u.is_superuser = True; u.is_active = True
u.set_password('SentinelX2025!')
u.save()
print('admin ready' if created else 'admin updated')
" || true

echo "Starting gunicorn..."
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
