from .base import BaseRule, Finding


class PrivilegeEscalationRule(BaseRule):
    """
    Fires on any PRIVILEGE_CHANGE event. These are inherently high-signal
    and warrant attention regardless of frequency.
    """

    name = "PRIVILEGE_ESCALATION"
    description = "Any privilege-change event is treated as a detection."

    def evaluate(self, event):
        if event.event_type != "PRIVILEGE_CHANGE":
            return []

        unknown_actor = not event.username or event.username == "unknown"
        confidence = 80 if unknown_actor else 65

        return [
            Finding(
                rule_name=self.name,
                confidence=confidence,
                reason=(
                    f"Privilege change by '{event.username or 'unknown'}' "
                    f"on device '{event.device or 'unknown'}'."
                ),
                risk_bump=35,
                mark_anomaly=True,
                metadata={"username": event.username},
            )
        ]