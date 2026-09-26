from rest_framework import serializers

from .models import SecurityEvent


class SecurityEventSerializer(serializers.ModelSerializer):

    source_ip_reputation = serializers.SerializerMethodField()

    class Meta:
        model = SecurityEvent
        fields = "__all__"
        read_only_fields = (
            "id",
            "timestamp",
            "created_at",
            "updated_at",
            "ml_score",
            "combined_risk_score",
        )

    def get_source_ip_reputation(self, event):
        if not event.source_ip:
            return None
        from threatintel.models import IPReputation
        rep = IPReputation.objects.filter(ip=event.source_ip).first()
        if not rep:
            return None
        return {
            "category": rep.category,
            "abuse_score": rep.abuse_score,
            "report_count": rep.report_count,
            "country": rep.country,
            "risk_level": rep.risk_level,
        }