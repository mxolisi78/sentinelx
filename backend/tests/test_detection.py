from datetime import timedelta

import pytest
from django.utils import timezone

from detection.engine import run_detection
from detection.models import Detection
from events.models import SecurityEvent


pytestmark = pytest.mark.django_db


def test_brute_force_rule_fires():
    now = timezone.now()
    events = []
    for i in range(6):
        events.append(
            SecurityEvent.objects.create(
                event_type="LOGIN_FAILED",
                severity="MEDIUM",
                source_ip="203.0.113.9",
                username="victim",
                message=f"fail {i}",
            )
        )
    for idx, ev in enumerate(events):
        SecurityEvent.objects.filter(pk=ev.pk).update(
            timestamp=now - timedelta(seconds=10 * (6 - idx))
        )

    report = run_detection()
    assert report.detections_created > 0
    assert Detection.objects.filter(rule_name="BRUTE_FORCE_LOGIN").exists()


def test_privilege_change_always_flagged():
    SecurityEvent.objects.create(
        event_type="PRIVILEGE_CHANGE",
        severity="HIGH",
        source_ip="10.0.0.1",
        username="attacker",
        message="escalation",
    )
    report = run_detection()
    assert report.detections_created >= 1
    assert Detection.objects.filter(rule_name="PRIVILEGE_ESCALATION").exists()


def test_same_rule_does_not_duplicate_on_rescan():
    """A given (event, rule) pair must never appear twice, even after --all."""
    SecurityEvent.objects.create(
        event_type="PRIVILEGE_CHANGE",
        severity="HIGH",
        source_ip="10.0.0.2",
        username="x",
        message="y",
    )
    run_detection()

    # Full rescan
    run_detection(SecurityEvent.objects.all())

    # The unique constraint guarantees no duplicates per (event, rule)
    for det in Detection.objects.all():
        matches = Detection.objects.filter(
            event=det.event, rule_name=det.rule_name
        ).count()
        assert matches == 1, f"Duplicate {det.rule_name} on event {det.event_id}"
