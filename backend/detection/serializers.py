from rest_framework import serializers

from .models import Detection


class DetectionSerializer(serializers.ModelSerializer):

    event_type = serializers.CharField(source="event.event_type", read_only=True)
    event_severity = serializers.CharField(source="event.severity", read_only=True)
    event_timestamp = serializers.DateTimeField(
        source="event.timestamp", read_only=True
    )

    class Meta:
        model = Detection
        fields = (
            "id",
            "event",
            "event_type",
            "event_severity",
            "event_timestamp",
            "rule_name",
            "confidence",
            "reason",
            "auto_escalated",
            "created_at",
        )
        read_only_fields = fields