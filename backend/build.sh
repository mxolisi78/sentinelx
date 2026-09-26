#!/usr/bin/env bash
# Render build script for SentinelX backend.
# Runs on every deploy.

set -o errexit  # exit on error

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input --settings=config.settings.prod

echo "Applying database migrations..."
python manage.py migrate --settings=config.settings.prod

echo "Ensuring admin user exists..."
python manage.py shell --settings=config.settings.prod -c "
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

echo "Build complete."
