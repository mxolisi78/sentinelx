from datetime import timedelta

from .base import BaseRule, Finding


class PortScanBurstRule(BaseRule):
    """
    Fires when 3+ port-scan events originate from the same IP
    within 10 minutes.
    """

    name = "PORT_SCAN_BURST"
    description = "3+ port scans from one IP within 10 minutes."
    WINDOW = timedelta(minutes=10)
    THRESHOLD = 3

    def evaluate(self, event):
        if event.event_type != "PORT_SCAN" or not event.source_ip:
            return []

        from events.models import SecurityEvent

        window_start = event.timestamp - self.WINDOW
        count = SecurityEvent.objects.filter(
            event_type="PORT_SCAN",
            source_ip=event.source_ip,
            timestamp__gte=window_start,
            timestamp__lte=event.timestamp,
        ).count()

        if count < self.THRESHOLD:
            return []

        confidence = min(95, 65 + (count - self.THRESHOLD) * 7)

        return [
            Finding(
                rule_name=self.name,
                confidence=confidence,
                reason=(
                    f"{count} port scans from {event.source_ip} "
                    f"within {self.WINDOW.seconds // 60} minutes."
                ),
                risk_bump=45,
                mark_anomaly=True,
                metadata={"count": count, "ip": event.source_ip},
            )
        ]