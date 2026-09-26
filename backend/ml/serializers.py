from rest_framework import serializers

from .models import AnomalyScore


class AnomalyScoreSerializer(serializers.ModelSerializer):

    event_type = serializers.CharField(source="event.event_type", read_only=True)
    event_severity = serializers.CharField(source="event.severity", read_only=True)
    event_username = serializers.CharField(source="event.username", read_only=True)
    event_source_ip = serializers.CharField(source="event.source_ip", read_only=True)

    class Meta:
        model = AnomalyScore
        fields = (
            "id",
            "event",
            "event_type",
            "event_severity",
            "event_username",
            "event_source_ip",
            "score",
            "normalized_score",
            "is_anomaly",
            "model_version",
            "scored_at",
        )
        read_only_fields = fields
