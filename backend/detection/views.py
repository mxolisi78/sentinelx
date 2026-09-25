from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAnalystOrAdmin
from events.models import SecurityEvent

from .engine import run_detection
from .models import Detection
from .serializers import DetectionSerializer


class DetectionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and inspect detection records.

    Query params:
      ?rule_name=BRUTE_FORCE_LOGIN    filter by rule
      ?event=<id>                     filter by source event
    """
    serializer_class = DetectionSerializer
    permission_classes = [IsAnalystOrAdmin]

    def get_queryset(self):
        qs = Detection.objects.select_related("event").all()
        rule = self.request.query_params.get("rule_name")
        event_id = self.request.query_params.get("event")
        if rule:
            qs = qs.filter(rule_name=rule)
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs


@api_view(["POST"])
@permission_classes([IsAnalystOrAdmin])
def analyze_events(request):
    """
    Run the SentinelX detection engine.

    Body (optional):
      { "all": true }   → re-scan every event
      {}                → scan only events with no prior detections
    """
    rescan_all = bool(request.data.get("all", False))

    if rescan_all:
        qs = SecurityEvent.objects.all()
    else:
        qs = SecurityEvent.objects.filter(detections__isnull=True).distinct()

    report = run_detection(qs)
    return Response(report.to_dict(), status=status.HTTP_200_OK)