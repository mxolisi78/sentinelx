"""
Read-only analytics endpoints for SentinelX.
"""

from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from detection.models import Detection
from events.models import SecurityEvent
from incidents.models import Incident


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def summary(request):
    """
    Return aggregated time-series data for the analytics dashboard.

    Query params:
      ?days=14    number of days to look back (default 14)
    """
    try:
        days = int(request.query_params.get("days", 14))
    except ValueError:
        days = 14
    days = max(1, min(days, 90))

    now = timezone.now()
    start = now - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    # ---- events per day ---------------------------------------------------
    events_per_day = list(
        SecurityEvent.objects
        .filter(timestamp__gte=start)
        .annotate(day=TruncDate("timestamp"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    events_per_day = [
        {"date": e["day"].isoformat(), "count": e["count"]}
        for e in events_per_day
    ]

    # ---- detections by rule, grouped by date -----------------------------
    detections_by_rule_raw = list(
        Detection.objects
        .filter(created_at__gte=start)
        .annotate(day=TruncDate("created_at"))
        .values("rule_name", "day")
        .annotate(count=Count("id"))
        .order_by("day", "rule_name")
    )
    detections_by_rule = [
        {
            "rule_name": d["rule_name"],
            "date": d["day"].isoformat(),
            "count": d["count"],
        }
        for d in detections_by_rule_raw
    ]

    # ---- incidents by severity -------------------------------------------
    incidents_by_severity = list(
        Incident.objects
        .values("severity")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    # ---- top source IPs --------------------------------------------------
    top_source_ips = list(
        SecurityEvent.objects
        .exclude(source_ip__isnull=True)
        .values("source_ip")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # ---- weekly trend ----------------------------------------------------
    one_week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)
    this_week = SecurityEvent.objects.filter(timestamp__gte=one_week_ago).count()
    last_week = SecurityEvent.objects.filter(
        timestamp__gte=two_weeks_ago, timestamp__lt=one_week_ago
    ).count()
    delta_pct = 0.0
    if last_week > 0:
        delta_pct = round(((this_week - last_week) / last_week) * 100, 1)

    return Response(
        {
            "days": days,
            "start": start.isoformat(),
            "end": now.isoformat(),
            "events_per_day": events_per_day,
            "detections_by_rule": detections_by_rule,
            "incidents_by_severity": incidents_by_severity,
            "top_source_ips": top_source_ips,
            "trends": {
                "events_this_week": this_week,
                "events_last_week": last_week,
                "delta_pct": delta_pct,
            },
        }
    )
