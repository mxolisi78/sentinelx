#!/usr/bin/env bash
set -o errexit

echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --no-input --settings=config.settings.prod

echo "Applying database migrations..."
python manage.py migrate --settings=config.settings.prod

echo "Ensuring admin user exists..."
python manage.py reset_admin --settings=config.settings.prod

echo "Seeding demo data if empty..."
python manage.py seed_all --settings=config.settings.prod || echo "Seed skipped (likely already populated)."

echo "Build complete."
