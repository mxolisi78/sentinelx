from django.db import models


class SecurityEvent(models.Model):

    EVENT_TYPES = [
        ("LOGIN_FAILED", "Failed Login"),
        ("LOGIN_SUCCESS", "Successful Login"),
        ("PRIVILEGE_CHANGE", "Privilege Change"),
        ("SUSPICIOUS_REQUEST", "Suspicious Request"),
        ("PORT_SCAN", "Port Scan"),
        ("DATA_ACCESS", "Data Access"),
        ("FILE_ACTIVITY", "File Activity"),
        ("SYSTEM_EVENT", "System Event"),
        ("OTHER", "Other"),
    ]

    SEVERITY_LEVELS = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPES
    )

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_LEVELS,
        default="LOW"
    )

    source_ip = models.GenericIPAddressField(
        null=True,
        blank=True
    )

    username = models.CharField(
        max_length=150,
        null=True,
        blank=True
    )

    device = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    location = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    message = models.TextField()

    timestamp = models.DateTimeField(
        auto_now_add=True
    )

    is_anomaly = models.BooleanField(
        default=False
    )

    risk_score = models.IntegerField(
        default=0
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    ml_score = models.IntegerField(
        default=0,
        help_text="ML anomaly score, mirrored from AnomalyScore.normalized_score.",
    )

    combined_risk_score = models.IntegerField(
        default=0,
        help_text="Unified risk: max of rule-based and ML signals.",
    )

    def __str__(self):
        return f"{self.event_type} - {self.severity} - {self.timestamp}"