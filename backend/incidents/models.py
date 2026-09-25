from django.conf import settings
from django.db import models

from events.models import SecurityEvent
from detection.models import Detection


class Incident(models.Model):

    STATUS_CHOICES = [
        ("OPEN", "Open"),
        ("INVESTIGATING", "Investigating"),
        ("RESOLVED", "Resolved"),
        ("CLOSED", "Closed"),
        ("FALSE_POSITIVE", "False Positive"),
    ]

    SEVERITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]

    title = models.CharField(max_length=255)

    description = models.TextField(
        blank=True,
        default="",
    )

    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default="MEDIUM",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="OPEN",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_incidents",
    )

    events = models.ManyToManyField(
        SecurityEvent,
        related_name="incidents",
        blank=True,
    )

    detections = models.ManyToManyField(
        Detection,
        related_name="incidents",
        blank=True,
    )

    resolution_notes = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title} ({self.status})"

    @property
    def is_open(self):
        return self.status in ("OPEN", "INVESTIGATING")

    @property
    def event_count(self):
        return self.events.count()

    @property
    def detection_count(self):
        return self.detections.count()