"""
Turns high-confidence detections into Incidents.

Called at the end of every detection run. Idempotent: an incident is
created only once per (event, rule_name) pair, even if the engine runs
multiple times.
"""

from django.db import transaction
from django.utils import timezone

from detection.models import Detection
from events.models import SecurityEvent

from .models import Incident

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


# Detections at or above this confidence spawn an incident.
INCIDENT_CONFIDENCE_THRESHOLD = 60

# Maps rule_name -> incident severity. Lets us tune per-rule urgency.
RULE_SEVERITY = {
    "BRUTE_FORCE_LOGIN": "HIGH",
    "PRIVILEGE_ESCALATION": "CRITICAL",
    "PORT_SCAN_BURST": "HIGH",
    "SUSPICIOUS_EXTERNAL_ACCESS": "HIGH",
    "OFF_HOURS_ADMIN_LOGIN": "MEDIUM",
    "HIGH_RISK_CORRELATION": "MEDIUM",
}


def _build_title(detection: Detection) -> str:
    event = detection.event
    return f"{detection.get_rule_name_display()} on {event.event_type}"


def _build_description(detection: Detection) -> str:
    event = detection.event
    lines = [
        f"Rule: {detection.get_rule_name_display()}",
        f"Confidence: {detection.confidence}%",
        f"Reason: {detection.reason}",
        "",
        f"Event type: {event.event_type}",
        f"Severity: {event.severity}",
        f"Source IP: {event.source_ip or 'unknown'}",
        f"User: {event.username or 'unknown'}",
        f"Device: {event.device or 'unknown'}",
        f"Location: {event.location or 'unknown'}",
        f"Risk score: {event.risk_score}",
        "",
        f"Message: {event.message}",
    ]
    return "\n".join(lines)


@transaction.atomic
def create_incidents_from_detections(detections=None) -> int:
    """
    For each detection above the confidence threshold, ensure an Incident
    exists. Returns the number of new incidents created.
    """
    if detections is None:
        detections = Detection.objects.select_related("event").all()

    created_count = 0

    for det in detections:
        if det.confidence < INCIDENT_CONFIDENCE_THRESHOLD:
            continue

        # Has this exact (event, rule) already produced an incident?
        already = Incident.objects.filter(
            detections__event=det.event,
            detections__rule_name=det.rule_name,
        ).exists()
        if already:
            continue

        severity = RULE_SEVERITY.get(det.rule_name, "MEDIUM")

        incident = Incident.objects.create(
            title=_build_title(det),
            description=_build_description(det),
            severity=severity,
            status="OPEN",
        )
        incident.events.add(det.event)
        incident.detections.add(det)
        created_count += 1

        incident.events.add(det.event)
        incident.detections.add(det)

        _broadcast_incident(incident)

        created_count += 1

    return created_count


@transaction.atomic
def resolve_incident(incident: Incident, notes: str = "") -> Incident:
    """Mark an incident resolved and stamp the resolution time."""
    incident.status = "RESOLVED"
    incident.resolved_at = timezone.now()
    if notes:
        incident.resolution_notes = notes
    incident.save(
        update_fields=["status", "resolved_at", "resolution_notes", "updated_at"]
    )
    return incident

def _broadcast_incident(incident):
    """Publish a newly created incident to all connected dashboards."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "sentinelx_activity",
            {
                "type": "feed.message",
                "payload": {
                    "event": "incident.created",
                    "incident": {
                        "id": incident.id,
                        "title": incident.title,
                        "severity": incident.severity,
                        "status": incident.status,
                        "created_at": incident.created_at.isoformat(),
                    },
                },
            },
        )
    except Exception as exc:
        # Never let a broadcast failure break the detection run
        print(f"[broadcast] Incident {incident.id} broadcast failed: {exc}")