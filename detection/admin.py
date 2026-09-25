from django.contrib import admin

from .models import Detection


@admin.register(Detection)
class DetectionAdmin(admin.ModelAdmin):

    list_display = (
        "rule_name",
        "event",
        "confidence",
        "auto_escalated",
        "created_at",
    )

    list_filter = (
        "rule_name",
        "auto_escalated",
    )

    search_fields = (
        "reason",
        "event__message",
    )

    ordering = ("-created_at",)