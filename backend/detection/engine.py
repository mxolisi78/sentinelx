"""
SentinelX detection engine.

Given a set of SecurityEvents, runs every registered rule against each
event, creates (or updates) Detection rows, and updates the event's risk
score and anomaly flag when a rule fires.

After the scan, high-confidence detections are promoted to Incidents.
"""

from dataclasses import dataclass, field
from typing import Iterable

from django.db import transaction
from django.utils import timezone

from events.models import SecurityEvent

from .models import Detection
from .rules.registry import discover_rules

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


@dataclass
class EngineReport:
    events_scanned: int = 0
    detections_created: int = 0
    detections_updated: int = 0
    events_escalated: int = 0
    incidents_created: int = 0
    by_rule: dict = field(default_factory=dict)
    duration_ms: int = 0

    def to_dict(self):
        return {
            "events_scanned": self.events_scanned,
            "detections_created": self.detections_created,
            "detections_updated": self.detections_updated,
            "events_escalated": self.events_escalated,
            "incidents_created": self.incidents_created,
            "by_rule": self.by_rule,
            "duration_ms": self.duration_ms,
        }


class DetectionEngine:
    def __init__(self):
        self.rules = discover_rules()

    def run(self, events: Iterable[SecurityEvent]) -> EngineReport:
        report = EngineReport()
        started = timezone.now()

        for event in events:
            report.events_scanned += 1
            event_bumped = False

            for rule in self.rules:
                try:
                    findings = rule.evaluate(event)
                except Exception as exc:
                    print(f"[engine] Rule {rule.name} failed on event #{event.id}: {exc}")
                    continue

                for finding in findings:
                    created, bumped = self._persist_finding(event, finding)
                    if created:
                        report.detections_created += 1
                    else:
                        report.detections_updated += 1
                    report.by_rule[finding.rule_name] = (
                        report.by_rule.get(finding.rule_name, 0) + 1
                    )
                    if bumped:
                        event_bumped = True

            if event_bumped:
                event.save(update_fields=["risk_score", "is_anomaly", "updated_at"])
                report.events_escalated += 1

        report.duration_ms = int((timezone.now() - started).total_seconds() * 1000)
        return report

    @transaction.atomic
    def _persist_finding(self, event: SecurityEvent, finding):
        """
        Upsert a Detection for this (event, rule_name) pair.

        Returns (created: bool, risk_bumped: bool).

        The risk bump is only applied the first time this rule fires on
        this event. Re-runs of the same rule update the confidence and
        reason in place without inflating the event's risk_score.
        """
        existing = Detection.objects.filter(
            event=event, rule_name=finding.rule_name
        ).first()

        if existing is None:
            event.risk_score = min(
                100, (event.risk_score or 0) + (finding.risk_bump or 0)
            )
            if finding.mark_anomaly:
                event.is_anomaly = True

                det = Detection.objects.create(
                event=event,
                rule_name=finding.rule_name,
                confidence=finding.confidence,
                reason=finding.reason,
                auto_escalated=bool(finding.risk_bump or finding.mark_anomaly),
            )
            self._broadcast_detection(det)
            return True, bool(finding.risk_bump or finding.mark_anomaly)

        changed = (
            existing.confidence != finding.confidence
            or existing.reason != finding.reason
        )
        if changed:
            existing.confidence = finding.confidence
            existing.reason = finding.reason
            existing.save(update_fields=["confidence", "reason"])

        return False, False


    def _broadcast_detection(self, det):
        """Publish a new detection to all connected dashboards."""
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "sentinelx_detections",
                {
                    "type": "feed.message",
                    "payload": {
                        "event": "detection.created",
                        "detection": {
                            "id": det.id,
                            "rule_name": det.rule_name,
                            "confidence": det.confidence,
                            "reason": det.reason,
                            "event_id": det.event_id,
                            "event_type": det.event.event_type,
                            "event_severity": det.event.severity,
                            "created_at": det.created_at.isoformat(),
                        },
                    },
                },
            )
        except Exception as exc:
            print(f"[broadcast] Detection {det.id} broadcast failed: {exc}")
            
def run_detection(queryset=None) -> EngineReport:
    """
    Convenience function. Defaults to scanning all events with no
    existing detections. After the scan, promotes high-confidence
    detections into Incidents.
    """
    if queryset is None:
        queryset = SecurityEvent.objects.filter(detections__isnull=True).distinct()

    engine = DetectionEngine()
    report = engine.run(list(queryset))

    # Auto-promote high-confidence detections to incidents.
    # Late import to avoid a circular dependency at module load.
    from incidents.factory import create_incidents_from_detections

    report.incidents_created = create_incidents_from_detections()

    return report