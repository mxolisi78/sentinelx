from django.contrib import admin

from .models import IOC, IPReputation


@admin.register(IPReputation)
class IPReputationAdmin(admin.ModelAdmin):
    list_display = (
        "ip",
        "category",
        "abuse_score",
        "report_count",
        "country",
        "risk_level",
        "fetched_at",
    )
    list_filter = ("category", "country", "source")
    search_fields = ("ip", "asn", "asn_owner")
    ordering = ("-abuse_score",)


@admin.register(IOC)
class IOCAdmin(admin.ModelAdmin):
    list_display = (
        "ioc_type",
        "value",
        "severity",
        "source",
        "tags",
        "created_at",
    )
    list_filter = ("ioc_type", "severity", "source")
    search_fields = ("value", "description", "tags")
    ordering = ("-created_at",)
