from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAnalystOrAdmin

from .models import Playbook, PlaybookExecution
from .serializers import PlaybookExecutionSerializer, PlaybookSerializer


class PlaybookViewSet(viewsets.ModelViewSet):
    """
    CRUD for response playbooks.

    - Viewers can read
    - Analysts and admins can create/update/delete
    """
    queryset = Playbook.objects.all()
    serializer_class = PlaybookSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAnalystOrAdmin()]

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        playbook = self.get_object()
        playbook.enabled = not playbook.enabled
        playbook.save(update_fields=["enabled", "updated_at"])
        return Response(PlaybookSerializer(playbook).data)


class PlaybookExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PlaybookExecutionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PlaybookExecution.objects.select_related("playbook", "incident").all()
        playbook_id = self.request.query_params.get("playbook")
        incident_id = self.request.query_params.get("incident")
        if playbook_id:
            qs = qs.filter(playbook_id=playbook_id)
        if incident_id:
            qs = qs.filter(incident_id=incident_id)
        return qs
