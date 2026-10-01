"""
Notification channel models.

A NotificationChannel is a destination for high-severity alerts:
a Slack webhook, an email recipient list, etc. NotificationLog
records every dispatch for auditing.
"""

from django.db import models


class NotificationChannel(models.Model):

    CHANNEL_TYPES = [
        ("SLACK", "Slack webhook"),
        ("EMAIL", "Email"),
    ]

    name = models.CharField(max_length=150, unique=True)

    channel_type = models.CharField(
        max_length=20,
        choices=CHANNEL_TYPES,
        default="SLACK",
    )

    # SLACK: {"webhook_url": "https://hooks.slack.com/..."}
    # EMAIL: {"recipients": ["a@b.com", "c@d.com"]}
    config = models.JSONField(
        default=dict,
        help_text="Channel-specific configuration.",
    )

    enabled = models.BooleanField(default=True)

    auto_notify = models.BooleanField(
        default=False,
        help_text=(
            "If True, SentinelX will automatically send HIGH/CRITICAL "
            "incident notifications to this channel as soon as an incident "
            "is created ? no playbook required."
        ),
    )

    min_severity = models.CharField(
        max_length=20,
        choices=[
            ("LOW", "Low"),
            ("MEDIUM", "Medium"),
            ("HIGH", "High"),
            ("CRITICAL", "Critical"),
        ],
        default="HIGH",
        help_text="Auto-notify only for incidents at or above this severity.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        status = "enabled" if self.enabled else "disabled"
        return f"{self.name} ({self.channel_type}, {status})"


class NotificationLog(models.Model):

    channel = models.ForeignKey(
        NotificationChannel,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notification_logs",
    )

    success = models.BooleanField(default=True)
    payload_preview = models.TextField(blank=True, default="")
    error = models.TextField(blank=True, default="")

    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sent_at"]
        indexes = [
            models.Index(fields=["-sent_at"]),
        ]

    def __str__(self):
        result = "OK" if self.success else "FAIL"
        return f"{self.channel.name} ? incident#{self.incident_id} [{result}]"
