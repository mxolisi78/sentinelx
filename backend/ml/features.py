"""
Feature engineering for the SentinelX ML anomaly detector.

Turns a SecurityEvent into a fixed-length numeric vector. The design
goal is interpretability: every feature has a clear meaning and could
be explained to an analyst.
"""

from datetime import time

import numpy as np

from events.models import SecurityEvent


# The order matters ? must match what the model was trained on.
FEATURE_NAMES = [
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "is_off_hours",
    "severity_numeric",
    "event_type_numeric",
    "is_external_ip",
    "username_is_privileged",
    "username_is_unknown",
    "message_length",
    "has_device",
    "has_location",
    "past_failures_from_ip",
    "past_events_from_user",
    "event_type_rarity",
]


SEVERITY_MAP = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

EVENT_TYPE_MAP = {
    "LOGIN_FAILED": 1,
    "LOGIN_SUCCESS": 2,
    "PRIVILEGE_CHANGE": 3,
    "SUSPICIOUS_REQUEST": 4,
    "PORT_SCAN": 5,
    "DATA_ACCESS": 6,
    "FILE_ACTIVITY": 7,
    "SYSTEM_EVENT": 8,
    "OTHER": 9,
}

PRIVILEGED_USERS = {"admin", "root", "administrator"}


def is_private_ip(ip: str) -> bool:
    if not ip:
        return True
    return (
        ip.startswith("10.")
        or ip.startswith("192.168.")
        or ip.startswith("127.")
        or ip.startswith("169.254.")
        or any(ip.startswith(f"172.{n}.") for n in range(16, 32))
    )


def extract_features(event: SecurityEvent) -> list[float]:
    """Return a fixed-length numeric vector for a single event."""

    ts = event.timestamp
    hour = ts.hour
    dow = ts.weekday()
    is_weekend = 1 if dow >= 5 else 0
    is_off_hours = 1 if (hour < 8 or hour >= 18) else 0

    severity_numeric = SEVERITY_MAP.get(event.severity, 1)
    event_type_numeric = EVENT_TYPE_MAP.get(event.event_type, 9)

    is_external = 0 if is_private_ip(event.source_ip) else 1

    username = (event.username or "").lower()
    username_is_privileged = 1 if username in PRIVILEGED_USERS else 0
    username_is_unknown = 1 if not username or username == "unknown" else 0

    message_length = len(event.message or "")
    has_device = 1 if event.device else 0
    has_location = 1 if event.location else 0

    # Count how many LOGIN_FAILED events from this IP occurred in the last 30 minutes
    from datetime import timedelta
    recent_window = ts - timedelta(minutes=30)
    past_failures_from_ip = SecurityEvent.objects.filter(
        event_type="LOGIN_FAILED",
        source_ip=event.source_ip,
        timestamp__gte=recent_window,
        timestamp__lt=ts,
    ).count() if event.source_ip else 0

    # Total events from this username
    past_events_from_user = (
        SecurityEvent.objects.filter(username=event.username).count()
        if event.username
        else 0
    )

    # Rarity of the event type across the whole corpus (simple ratio)
    total = SecurityEvent.objects.count()
    same_type = SecurityEvent.objects.filter(event_type=event.event_type).count()
    event_type_rarity = 1.0 - (same_type / total) if total else 0.0

    return [
        hour,
        dow,
        is_weekend,
        is_off_hours,
        severity_numeric,
        event_type_numeric,
        is_external,
        username_is_privileged,
        username_is_unknown,
        message_length,
        has_device,
        has_location,
        past_failures_from_ip,
        past_events_from_user,
        event_type_rarity,
    ]


def extract_matrix(events):
    """Return a numpy array of shape (n_events, n_features)."""
    rows = [extract_features(e) for e in events]
    return np.asarray(rows, dtype=float)
