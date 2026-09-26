# SentinelX

A lightweight Security Operations Center (SOC) platform for ingesting
security events, running detection rules against them, and managing
incidents end-to-end.

![CI](https://github.com/YOUR-USERNAME/sentinelx/actions/workflows/ci.yml/badge.svg)

## Features

- **JWT authentication** with three roles (Admin / Analyst / Viewer)
- **Security event ingestion** with severity, source IP, device, and location
- **Detection engine** with six built-in rules:
  - Brute Force Login
  - Off-Hours Admin Login
  - Privilege Escalation
  - Port Scan Burst
  - Suspicious External Access
  - High-Risk Correlation
- **Automatic incident creation** from high-confidence detections
- **Incident workflow** ? OPEN ? INVESTIGATING ? RESOLVED ? CLOSED / FALSE_POSITIVE
- **React dashboard** with live event, detection, and incident views
- **RBAC enforced at both API and UI layers**

## Tech Stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Backend     | Django 6 + Django REST Framework        |
| Auth        | JWT (djangorestframework-simplejwt)     |
| Frontend    | React 18 + Vite + React Router          |
| Database    | SQLite (dev) / PostgreSQL (prod)        |
| Deployment  | Docker Compose (Postgres + gunicorn + nginx) |
| Testing     | pytest + pytest-django + pytest-cov     |
| CI          | GitHub Actions                          |

## Quick Start (local development)

Prerequisites: Python 3.13+, Node 20+.

### Backend

```bash
cd backend
python -m venv ../.venv
source ../.venv/bin/activate       # Windows: ..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

The API is at http://127.0.0.1:8000/.

Frontend
bash
cd frontend
npm install
npm run dev
The UI is at http://localhost:5173/.

Optional: seed demo data
bash
cd backend
python manage.py seed_events --count 40 --clear
python manage.py run_detection
This creates ~40 realistic security events, runs detection, and auto-generates incidents.

Quick Start (Docker)
bash
docker compose up --build
Frontend: http://localhost:8080/

Backend API: http://localhost:8000/

Postgres: localhost:5432

The backend container waits for Postgres, runs migrations, ensures an
admin / SentinelX2025! user exists, and starts gunicorn.

API Overview
Endpoint    Method    Role required
/    GET    none
/api/auth/login/    POST    none
/api/auth/refresh/    POST    none
/api/auth/me/    GET    authenticated
/api/users/    GET    ADMIN
/api/events/    CRUD    authenticated
/api/events/analyze/    POST    ANALYST / ADMIN
/api/detections/    GET    ANALYST / ADMIN
/api/incidents/    CRUD    authenticated (write: ANALYST / ADMIN)
/api/incidents/<id>/status/    POST    ANALYST / ADMIN
/api/incidents/<id>/assign/    POST    ANALYST / ADMIN
Testing
bash
cd backend
pytest
Backend test coverage is currently ~75%.

Project Structure
text
SentinelX/
??? backend/
?   ??? accounts/      # Users, roles, JWT auth
?   ??? events/        # Security events
?   ??? detection/     # Rule engine + rules
?   ??? incidents/     # Incident lifecycle
?   ??? config/        # Django project, split settings
?   ??? tests/         # pytest suite
?   ??? manage.py
??? frontend/
?   ??? src/
?   ?   ??? api/       # Axios client
?   ?   ??? context/   # Auth context
?   ?   ??? components/# ProtectedRoute, etc.
?   ?   ??? pages/     # Login, Dashboard, Incidents
?   ??? package.json
??? .github/workflows/ # CI
??? docker-compose.yml
??? requirements.txt
License
Private project. All rights reserved.
