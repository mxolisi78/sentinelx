from django.utils import timezone
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAnalystOrAdmin

from .factory import resolve_incident
from .models import Incident
from .serializers import IncidentSerializer, IncidentStatusSerializer


class IncidentViewSet(viewsets.ModelViewSet):
    """
    CRUD for incidents.

    - Viewers can list and read.
    - Analysts and admins can create, update, assign, and close.
    """
    serializer_class = IncidentSerializer

    def get_queryset(self):
        qs = Incident.objects.select_related("assigned_to").all()
        status_filter = self.request.query_params.get("status")
        severity = self.request.query_params.get("severity")
        assigned = self.request.query_params.get("assigned_to")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if severity:
            qs = qs.filter(severity=severity)
        if assigned:
            qs = qs.filter(assigned_to_id=assigned)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAnalystOrAdmin()]

    @action(detail=True, methods=["post"], url_path="status")
    def update_status(self, request, pk=None):
        incident = self.get_object()
        serializer = IncidentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("resolution_notes", "")

        if new_status == "RESOLVED":
            resolve_incident(incident, notes)
        else:
            incident.status = new_status
            if notes:
                incident.resolution_notes = notes
            if new_status in ("CLOSED", "FALSE_POSITIVE") and not incident.resolved_at:
                incident.resolved_at = timezone.now()
            incident.save()

        return Response(IncidentSerializer(incident).data)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        incident = self.get_object()
        user_id = request.data.get("user_id")

        if user_id is None:
            incident.assigned_to = None
        else:
            from accounts.models import User
            try:
                incident.assigned_to = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                return Response(
                    {"detail": "User not found."},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

        incident.save(update_fields=["assigned_to", "updated_at"])
        return Response(IncidentSerializer(incident).data)