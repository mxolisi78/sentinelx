from rest_framework import serializers
from .models import SecurityEvent


class SecurityEventSerializer(serializers.ModelSerializer):

    class Meta:
        model = SecurityEvent
        fields = "__all__"
        read_only_fields = (
            "id",
            "timestamp",
            "created_at",
            "updated_at",
        )