from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAnalystOrAdmin
from events.models import SecurityEvent

from .detector import get_detector
from .models import AnomalyScore
from .serializers import AnomalyScoreSerializer


class AnomalyScoreViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AnomalyScoreSerializer
    permission_classes = [IsAnalystOrAdmin]

    def get_queryset(self):
        qs = AnomalyScore.objects.select_related("event").all()
        if self.request.query_params.get("anomalies_only") == "true":
            qs = qs.filter(is_anomaly=True)
        return qs


@api_view(["POST"])
@permission_classes([IsAnalystOrAdmin])
def train_model(request):
    detector = get_detector()
    contamination = float(request.data.get("contamination", 0.05))
    try:
        stats = detector.train(contamination=contamination)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"status": "trained", **stats})


@api_view(["POST"])
@permission_classes([IsAnalystOrAdmin])
def score_events(request):
    detector = get_detector()
    if not detector.is_trained:
        return Response(
            {"detail": "Model not trained. Call /api/ml/train/ first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    rescan_all = bool(request.data.get("all", False))
    if rescan_all:
        qs = SecurityEvent.objects.all()
    else:
        qs = SecurityEvent.objects.filter(anomaly_score__isnull=True)

    events = list(qs)
    if not events:
        return Response({"scored": 0, "anomalies": 0})

    results = detector.score_many(events)
    anomalies = 0
    for event, raw, normalized, is_anomaly in results:
        AnomalyScore.objects.update_or_create(
            event=event,
            defaults={
                "score": raw,
                "normalized_score": normalized,
                "is_anomaly": is_anomaly,
            },
        )
        # Mirror onto the event, refresh combined risk
        event.ml_score = normalized
        rule = event.risk_score or 0
        event.combined_risk_score = min(
            100, max(rule, int(normalized * 0.8 + rule * 0.2))
        )
        event.save(update_fields=["ml_score", "combined_risk_score", "updated_at"])
        if is_anomaly:
            anomalies += 1

    return Response({"scored": len(results), "anomalies": anomalies})
