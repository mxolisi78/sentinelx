from rest_framework import serializers

from .models import IOC, IPReputation


class IPReputationSerializer(serializers.ModelSerializer):

    risk_level = serializers.CharField(read_only=True)

    class Meta:
        model = IPReputation
        fields = (
            "id",
            "ip",
            "category",
            "abuse_score",
            "report_count",
            "country",
            "asn",
            "asn_owner",
            "source",
            "risk_level",
            "last_seen",
            "fetched_at",
        )
        read_only_fields = fields


class IOCSerializer(serializers.ModelSerializer):
    class Meta:
        model = IOC
        fields = (
            "id",
            "ioc_type",
            "value",
            "description",
            "severity",
            "source",
            "tags",
            "first_seen",
            "last_seen",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "first_seen", "last_seen")


class IPLookupQuerySerializer(serializers.Serializer):
    ip = serializers.IPAddressField()
