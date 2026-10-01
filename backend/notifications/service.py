"""
Notification service.

Builds incident notification payloads and dispatches them to
enabled channels. Logs every send to NotificationLog.
"""

import logging

from .models import NotificationChannel, NotificationLog
from .senders import dispatch


logger = logging.getLogger(__name__)

SEVERITY_ORDER = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


def _incident_message(incident):
    """Build the standard notification payload for an incident."""
    return {
        "title": f"{incident.severity} incident: {incident.title}",
        "body": (
            f"Status: {incident.status}\n"
            f"Severity: {incident.severity}\n"
            f"Events: {incident.event_count}\n"
            f"Detections: {incident.detection_count}\n\n"
            f"{(incident.description or '')[:400]}"
        ),
        "severity": incident.severity,
        "incident_id": incident.id,
    }


def notify_incident(incident, channels=None):
    """
    Send a notification for the given incident.

    channels: optional list of NotificationChannel. If None, uses every
    enabled channel whose min_severity is met.
    """
    if channels is None:
        threshold = SEVERITY_ORDER.get(incident.severity, 0)
        channels = [
            c for c in NotificationChannel.objects.filter(enabled=True)
            if SEVERITY_ORDER.get(c.min_severity, 0) <= threshold
        ]

    message = _incident_message(incident)
    sent = 0
    for channel in channels:
        result = dispatch(channel, message)
        NotificationLog.objects.create(
            channel=channel,
            incident=incident,
            success=result.get("success", False),
            payload_preview=result.get("preview", "")[:500],
            error=result.get("error", ""),
        )
        if result.get("success"):
            sent += 1

    return sent


def auto_notify(incident):
    """
    Called after incident creation. Sends to every enabled channel with
    auto_notify=True whose min_severity is at or below the incident severity.
    """
    incident_level = SEVERITY_ORDER.get(incident.severity, 0)

    candidates = [
        c for c in NotificationChannel.objects.filter(enabled=True, auto_notify=True)
        if SEVERITY_ORDER.get(c.min_severity, 0) <= incident_level
    ]

    if not candidates:
        return 0

    return notify_incident(incident, channels=candidates)


def send_raw(channel, title, body, severity="MEDIUM"):
    """Used by the /test/ endpoint ? sends an arbitrary message."""
    message = {"title": title, "body": body, "severity": severity}
    result = dispatch(channel, message)
    NotificationLog.objects.create(
        channel=channel,
        incident=None,
        success=result.get("success", False),
        payload_preview=result.get("preview", "")[:500],
        error=result.get("error", ""),
    )
    return result
