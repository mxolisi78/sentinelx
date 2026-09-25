from django.contrib import admin
from .models import SecurityEvent


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):

    list_display = (
        "event_type",
        "severity",
        "source_ip",
        "username",
        "is_anomaly",
        "risk_score",
        "timestamp",
    )

    list_filter = (
        "event_type",
        "severity",
        "is_anomaly",
    )

    search_fields = (
        "source_ip",
        "username",
        "message",
    )

    ordering = (
        "-timestamp",
    )
