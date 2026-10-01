# SentinelX

[![CI](https://github.com/mxolisi78/sentinelx/actions/workflows/ci.yml/badge.svg)](https://github.com/mxolisi78/sentinelx/actions/workflows/ci.yml)

A lightweight Security Operations Center (SOC) platform for ingesting
security events, running rule-based and ML detection, auto-creating
incidents, and orchestrating response playbooks ? with real-time alerts
delivered over WebSockets.

## Live Demo

- **Frontend:** https://sentinelx-frontend-r3ck.onrender.com
- **Backend API:** https://sentinelx-backend-8o58.onrender.com

**Demo login:** `admin` / `SentinelX2025!`

> The backend is on Render's free tier and spins down after 15 minutes
> of inactivity. The first request after idle may take up to 60 seconds
> to respond.

## Features

### Detection
- **Rule engine** with six built-in detectors: brute force login,
  off-hours admin login, privilege escalation, port scan burst,
  suspicious external access, and high-risk correlation
- **ML anomaly detection** using scikit-learn IsolationForest trained
  on the historical event corpus
- **Combined risk score** that blends rule and ML signals into a single
  0-100 number per event
- Auto-incident creation for high-confidence detections

### Threat Intelligence
- **IP reputation** lookup with pluggable providers (local seed by default)
- **IOC tracking** (IPs, domains, URLs, hashes, emails)
- Reputation data automatically attached to incident descriptions
- Searchable reputation table and IOC list in the UI

### Response Playbooks
- **Trigger conditions**: severity, detection rule, IP reputation
  category, or combined-risk threshold
- **Actions**: set status, set severity, assign to user, add note,
  create event, send notification
- Full audit trail of every playbook execution

### Notifications
- **Slack webhooks** and **email** channels
- Auto-notify on high-severity incidents
- Manual test button per channel
- Complete send log with success/failure and preview

### Real-Time
- WebSocket updates via Django Channels
- Live dashboard refresh when new events, detections, or incidents arrive
- Toast notifications for CRITICAL and HIGH severity incidents

### Platform
- **JWT authentication** with three roles: Admin, Analyst, Viewer
- **RBAC** enforced at both API and UI layers
- **Dark/light theme** with persisted preference
- **Analytics dashboard** with time-series charts (Recharts)
- **Docker Compose** ready (Postgres + gunicorn + nginx)
- **GitHub Actions CI** running tests on every push
- **18+ pytest tests**, ~75% backend coverage

## Tech Stack

| Layer       | Technology                                       |
| ----------- | ------------------------------------------------ |
| Backend     | Django 6 + Django REST Framework                 |
| Auth        | JWT (djangorestframework-simplejwt)              |
| Real-time   | Django Channels + Daphne (ASGI)                  |
| ML          | scikit-learn (IsolationForest), pandas, numpy    |
| Frontend    | React 18 + Vite + Tailwind CSS + Recharts        |
| Icons       | lucide-react                                     |
| Database    | SQLite (dev) / PostgreSQL (prod)                 |
| Deployment  | Render (Blueprint) + Docker Compose              |
| Testing     | pytest + pytest-django + pytest-cov              |
| CI          | GitHub Actions                                   |

## Quick Start (local development)

Prerequisites: Python 3.13+, Node 20+.

### Backend

    cd backend
    python -m venv ../.venv
    source ../.venv/bin/activate       # Windows: ..\.venv\Scripts\Activate.ps1
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
    python manage.py migrate
    python manage.py seed_events --count 40 --clear
    python manage.py seed_threatintel --clear
    python manage.py train_anomaly
    python manage.py score_events --all
    python manage.py seed_playbooks --clear
    python manage.py seed_notification_channels --clear
    python manage.py run_detection
    python manage.py reset_admin
    python manage.py runserver

The API is at http://127.0.0.1:8000/.

### Frontend

    cd frontend
    npm install
    npm run dev

The UI is at http://localhost:5173/.

Login with `admin` / `SentinelX2025!`.

## Quick Start (Docker)

    docker compose up --build

- Frontend: http://localhost:8080/
- Backend: http://localhost:8000/
- Postgres: localhost:5432

## API Overview

| Endpoint                                       | Method     | Role required         |
| ---------------------------------------------- | ---------- | --------------------- |
| /                                              | GET        | none                  |
| /api/auth/login/                               | POST       | none                  |
| /api/auth/refresh/                             | POST       | none                  |
| /api/auth/me/                                  | GET        | authenticated         |
| /api/users/                                    | GET        | ADMIN                 |
| /api/events/                                   | CRUD       | authenticated         |
| /api/events/analyze/                           | POST       | ANALYST / ADMIN       |
| /api/detections/                               | GET        | ANALYST / ADMIN       |
| /api/incidents/                                | CRUD       | authenticated (write: ANALYST / ADMIN) |
| /api/incidents/<id>/status/                    | POST       | ANALYST / ADMIN       |
| /api/incidents/<id>/assign/                    | POST       | ANALYST / ADMIN       |
| /api/ml/train/                                 | POST       | ANALYST / ADMIN       |
| /api/ml/score/                                 | POST       | ANALYST / ADMIN       |
| /api/ml/anomaly-scores/                        | GET        | ANALYST / ADMIN       |
| /api/threatintel/reputations/                  | GET        | authenticated         |
| /api/threatintel/reputations/lookup/           | GET        | authenticated         |
| /api/threatintel/reputations/refresh/          | POST       | ANALYST / ADMIN       |
| /api/threatintel/iocs/                         | CRUD       | read: any, write: ANALYST / ADMIN |
| /api/analytics/summary/                        | GET        | authenticated         |
| /api/playbooks/                                | CRUD       | read: any, write: ANALYST / ADMIN |
| /api/playbooks/<id>/toggle/                    | POST       | ANALYST / ADMIN       |
| /api/playbook-executions/                      | GET        | authenticated         |
| /api/notifications/channels/                   | CRUD       | read: any, write: ANALYST / ADMIN |
| /api/notifications/channels/<id>/toggle/       | POST       | ANALYST / ADMIN       |
| /api/notifications/channels/<id>/test/         | POST       | ANALYST / ADMIN       |
| /api/notifications/logs/                       | GET        | authenticated         |
| /ws/activity/                                  | WebSocket  | JWT via ?token=       |

## Project Structure

    SentinelX/
    ??? backend/
    ?   ??? accounts/         # Users, JWT auth, RBAC
    ?   ??? events/           # Security events, seed commands
    ?   ??? detection/        # Rule engine, WebSocket consumers
    ?   ??? incidents/        # Incident lifecycle, factory
    ?   ??? ml/               # IsolationForest anomaly detection
    ?   ??? threatintel/      # IP reputation, IOCs
    ?   ??? analytics/        # Time-series aggregation endpoint
    ?   ??? playbooks/        # Response playbook engine
    ?   ??? notifications/    # Slack + email senders
    ?   ??? config/           # Split settings (base / dev / prod)
    ?   ??? tests/            # pytest suite
    ?   ??? manage.py
    ??? frontend/
    ?   ??? src/
    ?   ?   ??? api/          # Axios client + WebSocket hook
    ?   ?   ??? context/      # Auth + Theme contexts
    ?   ?   ??? components/   # Shared UI (ToastHost, ThreatBadge, etc.)
    ?   ?   ??? pages/        # Login, Dashboard, Analytics, Incidents,
    ?   ?                     # ThreatIntel, Playbooks, Settings
    ?   ??? package.json
    ??? .github/workflows/    # CI
    ??? render.yaml           # Render Blueprint
    ??? docker-compose.yml
    ??? requirements.txt

## License

Private project. All rights reserved.
