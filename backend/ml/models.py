from django.db import models

from events.models import SecurityEvent


class AnomalyScore(models.Model):
    event = models.OneToOneField(
        SecurityEvent,
        on_delete=models.CASCADE,
        related_name="anomaly_score",
    )
    score = models.FloatField(
        help_text="Raw model decision_function output."
    )
    normalized_score = models.IntegerField(default=0)
    is_anomaly = models.BooleanField(default=False)
    model_version = models.CharField(max_length=32, default="v1")
    scored_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-normalized_score", "-scored_at"]
        indexes = [
            models.Index(fields=["-normalized_score"]),
            models.Index(fields=["is_anomaly"]),
        ]

    def __str__(self):
        return f"event#{self.event_id} score={self.normalized_score}"
