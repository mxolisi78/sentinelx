from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAnalystOrAdmin
from rest_framework.permissions import IsAuthenticated

from .models import IOC, IPReputation
from .serializers import IOCSerializer, IPReputationSerializer
from .services import enrich_ip, summary_for_ip


class IPReputationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view of cached IP reputations.

    Query params:
      ?category=MALICIOUS
      ?risk_level=CRITICAL
      ?ip=1.2.3.4
    """
    serializer_class = IPReputationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = IPReputation.objects.all()
        category = self.request.query_params.get("category")
        ip = self.request.query_params.get("ip")
        risk = self.request.query_params.get("risk_level")

        if category:
            qs = qs.filter(category=category)
        if ip:
            qs = qs.filter(ip=ip)
        if risk:
            if risk == "CRITICAL":
                qs = qs.filter(abuse_score__gte=75)
            elif risk == "HIGH":
                qs = qs.filter(abuse_score__gte=50, abuse_score__lt=75)
            elif risk == "MEDIUM":
                qs = qs.filter(abuse_score__gte=25, abuse_score__lt=50)
            elif risk == "LOW":
                qs = qs.filter(abuse_score__lt=25)
        return qs

    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup(self, request):
        """Lookup a single IP's reputation (fetches if not cached)."""
        ip = request.query_params.get("ip")
        if not ip:
            return Response(
                {"detail": "Query param 'ip' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rep = enrich_ip(ip)
        if not rep:
            return Response({"ip": ip, "known": False}, status=status.HTTP_200_OK)
        return Response(
            {"ip": ip, "known": True, **IPReputationSerializer(rep).data}
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="refresh",
        permission_classes=[IsAnalystOrAdmin],
    )
    def refresh(self, request):
        """Force-refresh a single IP or all cached IPs."""
        ip = request.data.get("ip")
        if ip:
            rep = enrich_ip(ip, force_refresh=True)
            if not rep:
                return Response(
                    {"detail": "Lookup returned no data."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(IPReputationSerializer(rep).data)

        # Refresh everything
        count = 0
        for rep in IPReputation.objects.all():
            if enrich_ip(rep.ip, force_refresh=True):
                count += 1
        return Response({"refreshed": count})


class IOCViewSet(viewsets.ModelViewSet):
    """
    Indicators of Compromise.

    - Viewers can read
    - Analysts and admins can create/update/delete
    """
    serializer_class = IOCSerializer
    queryset = IOC.objects.all()

    def get_queryset(self):
        qs = IOC.objects.all()
        ioc_type = self.request.query_params.get("ioc_type")
        severity = self.request.query_params.get("severity")
        value = self.request.query_params.get("value")
        if ioc_type:
            qs = qs.filter(ioc_type=ioc_type)
        if severity:
            qs = qs.filter(severity=severity)
        if value:
            qs = qs.filter(value__icontains=value)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        return [IsAnalystOrAdmin()]
