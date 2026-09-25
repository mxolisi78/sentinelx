from rest_framework import serializers

from accounts.models import User
from .models import Incident


class IncidentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "role")
        read_only_fields = fields


class IncidentSerializer(serializers.ModelSerializer):

    assigned_to_detail = IncidentUserSerializer(source="assigned_to", read_only=True)
    event_count = serializers.IntegerField(read_only=True)
    detection_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Incident
        fields = (
            "id",
            "title",
            "description",
            "severity",
            "status",
            "assigned_to",
            "assigned_to_detail",
            "event_count",
            "detection_count",
            "resolution_notes",
            "created_at",
            "updated_at",
            "resolved_at",
        )
        read_only_fields = (
            "id",
            "event_count",
            "detection_count",
            "created_at",
            "updated_at",
            "resolved_at",
        )


class IncidentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[c[0] for c in Incident.STATUS_CHOICES])
    resolution_notes = serializers.CharField(required=False, allow_blank=True)