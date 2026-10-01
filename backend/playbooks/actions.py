"""
Individual playbook action handlers.

Each action receives the incident being processed and the value from
the playbook's action list. Returns a small dict describing what it did,
which gets appended to the PlaybookExecution's actions_run log.
"""

import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

from events.models import SecurityEvent


logger = logging.getLogger(__name__)
User = get_user_model()


def _handle_set_status(incident, value):
    incident.status = value
    if value in ("RESOLVED", "CLOSED", "FALSE_POSITIVE") and not incident.resolved_at:
        incident.resolved_at = timezone.now()
    incident.save(update_fields=["status", "resolved_at", "updated_at"])
    return {"action": "SET_STATUS", "value": value, "result": "ok"}


def _handle_set_severity(incident, value):
    incident.severity = value
    incident.save(update_fields=["severity", "updated_at"])
    return {"action": "SET_SEVERITY", "value": value, "result": "ok"}


def _handle_assign_to(incident, value):
    try:
        user = User.objects.get(username=value)
    except User.DoesNotExist:
        return {
            "action": "ASSIGN_TO",
            "value": value,
            "result": f"user '{value}' not found",
        }
    incident.assigned_to = user
    incident.save(update_fields=["assigned_to", "updated_at"])
    return {"action": "ASSIGN_TO", "value": value, "result": "ok"}


def _handle_add_note(incident, value):
    prefix = incident.resolution_notes or ""
    sep = "\n\n" if prefix else ""
    incident.resolution_notes = f"{prefix}{sep}[playbook] {value}"
    incident.save(update_fields=["resolution_notes", "updated_at"])
    return {"action": "ADD_NOTE", "value": value, "result": "ok"}


def _handle_create_event(incident, value):
    """
    value is a dict: {"event_type": "...", "severity": "...", "message": "..."}
    or a string used as the message.
    """
    if isinstance(value, dict):
        event_type = value.get("event_type", "SYSTEM_EVENT")
        severity = value.get("severity", "LOW")
        message = value.get("message", "Playbook-generated event")
    else:
        event_type = "SYSTEM_EVENT"
        severity = "LOW"
        message = str(value)

    # Attach the source IP from the incident's linked event if possible
    source_ip = None
    first_detection = incident.detections.first()
    if first_detection and first_detection.event:
        source_ip = first_detection.event.source_ip

    event = SecurityEvent.objects.create(
        event_type=event_type,
        severity=severity,
        source_ip=source_ip,
        username="playbook",
        message=message,
    )
    return {
        "action": "CREATE_EVENT",
        "value": value,
        "result": f"event#{event.id} created",
    }


def _handle_notify(incident, value):
    """
    Send a notification about this incident to configured channels.

    value can be:
      - a string → sent as the body of the alert (uses default title)
      - a dict with {"title": "...", "body": "...", "channels": ["name1"]}
    """
    from notifications.models import NotificationChannel
    from notifications.service import notify_incident

    channel_names = None
    body = None
    title = None

    if isinstance(value, dict):
        body = value.get("body")
        title = value.get("title")
        channel_names = value.get("channels")

    channels = None
    if channel_names:
        channels = list(NotificationChannel.objects.filter(name__in=channel_names, enabled=True))

    sent = notify_incident(incident, channels=channels)
    return {
        "action": "NOTIFY",
        "value": value,
        "result": f"sent to {sent} channel(s)",
    }


HANDLERS = {
    "SET_STATUS": _handle_set_status,
    "SET_SEVERITY": _handle_set_severity,
    "ASSIGN_TO": _handle_assign_to,
    "ADD_NOTE": _handle_add_note,
    "CREATE_EVENT": _handle_create_event,
    "NOTIFY": _handle_notify,
}


def run_action(action, incident):
    """
    Execute a single action dict: {"type": "...", "value": "..."}.
    Returns a result dict. Never raises.
    """
    action_type = action.get("type")
    value = action.get("value")

    handler = HANDLERS.get(action_type)
    if not handler:
        return {
            "action": action_type or "UNKNOWN",
            "value": value,
            "result": f"unknown action type '{action_type}'",
        }

    try:
        return handler(incident, value)
    except Exception as exc:
        logger.exception("Action %s failed: %s", action_type, exc)
        return {
            "action": action_type,
            "value": value,
            "result": f"error: {exc}",
        }
