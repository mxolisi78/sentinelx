"""
Response playbook models.

A Playbook defines a set of trigger conditions and a list of actions to
run when the conditions match a newly-created incident. Every execution
is logged in PlaybookExecution so we have a full audit trail.
"""

from django.conf import settings
from django.db import models


class Playbook(models.Model):

    TRIGGER_TYPES = [
        ("SEVERITY", "Incident severity equals"),
        ("RULE", "Detection rule name equals"),
        ("IP_CATEGORY", "Source IP reputation category equals"),
        ("MIN_RISK", "Event combined risk >= threshold"),
    ]

    ACTION_TYPES = [
        ("SET_STATUS", "Set incident status"),
        ("SET_SEVERITY", "Set incident severity"),
        ("ASSIGN_TO", "Assign to user (by username)"),
        ("ADD_NOTE", "Append to resolution notes"),
        ("CREATE_EVENT", "Create a new SecurityEvent"),
        ("NOTIFY", "Send a notification (Feature C)"),
    ]

    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True, default="")

    enabled = models.BooleanField(default=True)

    # Trigger: {"type": "SEVERITY", "value": "CRITICAL"}
    # or {"type": "RULE", "value": "BRUTE_FORCE_LOGIN"}
    # or {"type": "IP_CATEGORY", "value": "TOR_EXIT"}
    # or {"type": "MIN_RISK", "value": 75}
    trigger = models.JSONField(
        help_text="Trigger condition evaluated against each new incident.",
    )

    # Actions: [{"type": "SET_STATUS", "value": "INVESTIGATING"}, ...]
    actions = models.JSONField(
        default=list,
        help_text="Ordered list of actions to execute on match.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        status = "enabled" if self.enabled else "disabled"
        return f"{self.name} ({status})"


class PlaybookExecution(models.Model):

    playbook = models.ForeignKey(
        Playbook,
        on_delete=models.CASCADE,
        related_name="executions",
    )
    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.CASCADE,
        related_name="playbook_executions",
    )

    success = models.BooleanField(default=True)
    actions_run = models.JSONField(
        default=list,
        help_text="Log of each action executed and its result.",
    )
    error = models.TextField(blank=True, default="")

    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-executed_at"]
        indexes = [
            models.Index(fields=["-executed_at"]),
            models.Index(fields=["playbook", "-executed_at"]),
        ]

    def __str__(self):
        result = "OK" if self.success else "FAIL"
        return f"{self.playbook.name} ? incident#{self.incident_id} [{result}]"
