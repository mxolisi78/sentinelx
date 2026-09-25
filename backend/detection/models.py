from django.db import models

from events.models import SecurityEvent


class Detection(models.Model):
    """
    A record of a rule that fired against a SecurityEvent.

    Multiple rules can fire on the same event — each produces its own
    Detection row. The rule engine is responsible for creating these.
    """

    RULE_CHOICES = [
        ("BRUTE_FORCE_LOGIN", "Brute Force Login"),
        ("OFF_HOURS_ADMIN_LOGIN", "Off-Hours Admin Login"),
        ("PRIVILEGE_ESCALATION", "Privilege Escalation"),
        ("PORT_SCAN_BURST", "Port Scan Burst"),
        ("SUSPICIOUS_EXTERNAL_ACCESS", "Suspicious External Access"),
        ("HIGH_RISK_CORRELATION", "High-Risk Correlation"),
    ]

    event = models.ForeignKey(
        SecurityEvent,
        on_delete=models.CASCADE,
        related_name="detections",
    )

    rule_name = models.CharField(
        max_length=64,
        choices=RULE_CHOICES,
    )

    confidence = models.IntegerField(
        default=50,
        help_text="Confidence score 0–100 produced by the rule.",
    )

    reason = models.TextField(
        help_text="Human-readable explanation of why the rule fired.",
    )

    auto_escalated = models.BooleanField(
        default=False,
        help_text="True if this detection caused the event's risk to jump.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["rule_name"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.rule_name} → event#{self.event_id} ({self.confidence}%)"