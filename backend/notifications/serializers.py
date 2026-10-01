from rest_framework import serializers

from .models import NotificationChannel, NotificationLog


class NotificationChannelSerializer(serializers.ModelSerializer):
    log_count = serializers.SerializerMethodField()

    class Meta:
        model = NotificationChannel
        fields = (
            "id",
            "name",
            "channel_type",
            "config",
            "enabled",
            "auto_notify",
            "min_severity",
            "log_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "log_count", "created_at", "updated_at")

    def get_log_count(self, channel):
        return channel.logs.count()


class NotificationLogSerializer(serializers.ModelSerializer):
    channel_name = serializers.CharField(source="channel.name", read_only=True)
    incident_title = serializers.CharField(source="incident.title", read_only=True)

    class Meta:
        model = NotificationLog
        fields = (
            "id",
            "channel",
            "channel_name",
            "incident",
            "incident_title",
            "success",
            "payload_preview",
            "error",
            "sent_at",
        )
        read_only_fields = fields
