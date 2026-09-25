"""
SentinelX detection engine.

Given a set of SecurityEvents, runs every registered rule against each
event, creates Detection rows, and updates the event's risk score and
anomaly flag when a rule fires.
"""

from dataclasses import dataclass, field
from typing import Iterable

from django.db import transaction
from django.utils import timezone

from events.models import SecurityEvent

from .models import Detection
from .rules.registry import discover_rules


@dataclass
class EngineReport:
    events_scanned: int = 0
    detections_created: int = 0
    events_escalated: int = 0
    by_rule: dict = field(default_factory=dict)
    duration_ms: int = 0

    def to_dict(self):
        return {
            "events_scanned": self.events_scanned,
            "detections_created": self.detections_created,
            "events_escalated": self.events_escalated,
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
                    self._persist_finding(event, finding)
                    report.detections_created += 1
                    report.by_rule[finding.rule_name] = (
                        report.by_rule.get(finding.rule_name, 0) + 1
                    )
                    if finding.risk_bump or finding.mark_anomaly:
                        event_bumped = True

            if event_bumped:
                event.save(update_fields=["risk_score", "is_anomaly", "updated_at"])
                report.events_escalated += 1

        report.duration_ms = int((timezone.now() - started).total_seconds() * 1000)
        return report

    @transaction.atomic
    def _persist_finding(self, event: SecurityEvent, finding) -> Detection:
        new_score = min(100, (event.risk_score or 0) + (finding.risk_bump or 0))
        event.risk_score = new_score

        if finding.mark_anomaly:
            event.is_anomaly = True

        return Detection.objects.create(
            event=event,
            rule_name=finding.rule_name,
            confidence=finding.confidence,
            reason=finding.reason,
            auto_escalated=bool(finding.risk_bump or finding.mark_anomaly),
        )


def run_detection(queryset=None) -> EngineReport:
    """
    Convenience function. Defaults to scanning all events that have no
    existing detections.
    """
    if queryset is None:
        queryset = SecurityEvent.objects.filter(detections__isnull=True).distinct()

    engine = DetectionEngine()
    return engine.run(list(queryset))