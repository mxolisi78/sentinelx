from .base import BaseRule, Finding


class HighRiskCorrelationRule(BaseRule):
    """
    Fires on events whose stored severity is already CRITICAL, or that
    are already flagged as anomalies. Acts as a safety net.
    """

    name = "HIGH_RISK_CORRELATION"
    description = "Event is already CRITICAL severity or flagged anomalous."

    def evaluate(self, event):
        already_high = event.severity == "CRITICAL"
        already_anomaly = event.is_anomaly

        if not (already_high or already_anomaly):
            return []

        reasons = []
        if already_high:
            reasons.append("severity is CRITICAL")
        if already_anomaly:
            reasons.append("event was already flagged as anomalous")

        return [
            Finding(
                rule_name=self.name,
                confidence=60,
                reason="High-risk signal: " + " and ".join(reasons) + ".",
                risk_bump=20,
                mark_anomaly=True,
                metadata={"severity": event.severity},
            )
        ]