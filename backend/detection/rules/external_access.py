from .base import BaseRule, Finding


class SuspiciousExternalAccessRule(BaseRule):
    """
    Fires when sensitive operations come from a public (non-RFC1918) IP.
    """

    name = "SUSPICIOUS_EXTERNAL_ACCESS"
    description = "Data access or suspicious request from external IP."
    SENSITIVE_TYPES = {"DATA_ACCESS", "SUSPICIOUS_REQUEST"}

    def evaluate(self, event):
        if event.event_type not in self.SENSITIVE_TYPES:
            return []
        if not event.source_ip:
            return []

        if self.is_private_ip(event.source_ip):
            return []

        return [
            Finding(
                rule_name=self.name,
                confidence=75,
                reason=(
                    f"{event.event_type} from external IP {event.source_ip} "
                    f"targeting '{event.username or 'unknown'}'."
                ),
                risk_bump=35,
                mark_anomaly=True,
                metadata={"ip": event.source_ip, "type": event.event_type},
            )
        ]