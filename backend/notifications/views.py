from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAnalystOrAdmin

from .models import NotificationChannel, NotificationLog
from .serializers import NotificationChannelSerializer, NotificationLogSerializer
from .service import send_raw


class NotificationChannelViewSet(viewsets.ModelViewSet):
    """
    CRUD for notification channels.

    - Viewers can read
    - Analysts and admins can create/update/delete
    """
    queryset = NotificationChannel.objects.all()
    serializer_class = NotificationChannelSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAnalystOrAdmin()]

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        channel = self.get_object()
        channel.enabled = not channel.enabled
        channel.save(update_fields=["enabled", "updated_at"])
        return Response(NotificationChannelSerializer(channel).data)

    @action(detail=True, methods=["post"], url_path="test")
    def test(self, request, pk=None):
        channel = self.get_object()
        result = send_raw(
            channel,
            title="SentinelX test notification",
            body=(
                f"This is a test message sent from the SentinelX settings page.\n\n"
                f"Channel: {channel.name}\n"
                f"Type: {channel.channel_type}\n"
                f"If you received this, the channel is working."
            ),
            severity="MEDIUM",
        )
        return Response(
            result,
            status=status.HTTP_200_OK if result.get("success") else status.HTTP_400_BAD_REQUEST,
        )


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = NotificationLog.objects.select_related("channel", "incident").all()
        channel_id = self.request.query_params.get("channel")
        incident_id = self.request.query_params.get("incident")
        if channel_id:
            qs = qs.filter(channel_id=channel_id)
        if incident_id:
            qs = qs.filter(incident_id=incident_id)
        return qs
