from datetime import timedelta

from .base import BaseRule, Finding


class BruteForceLoginRule(BaseRule):
    """
    Fires when 5+ failed logins occur from the same source IP
    within a 5-minute window.
    """

    name = "BRUTE_FORCE_LOGIN"
    description = "5+ failed logins from one IP within 5 minutes."
    WINDOW = timedelta(minutes=5)
    THRESHOLD = 5

    def evaluate(self, event):
        if event.event_type != "LOGIN_FAILED" or not event.source_ip:
            return []

        from events.models import SecurityEvent

        window_start = event.timestamp - self.WINDOW
        count = SecurityEvent.objects.filter(
            event_type="LOGIN_FAILED",
            source_ip=event.source_ip,
            timestamp__gte=window_start,
            timestamp__lte=event.timestamp,
        ).count()

        if count < self.THRESHOLD:
            return []

        confidence = min(95, 60 + (count - self.THRESHOLD) * 5)

        return [
            Finding(
                rule_name=self.name,
                confidence=confidence,
                reason=(
                    f"Detected {count} failed login attempts from "
                    f"{event.source_ip} within {self.WINDOW.seconds // 60} minutes."
                ),
                risk_bump=40,
                mark_anomaly=True,
                metadata={"count": count, "ip": event.source_ip},
            )
        ]