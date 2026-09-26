from django.contrib import admin

from .models import AnomalyScore


@admin.register(AnomalyScore)
class AnomalyScoreAdmin(admin.ModelAdmin):

    list_display = (
        "event",
        "normalized_score",
        "is_anomaly",
        "model_version",
        "scored_at",
    )
    list_filter = ("is_anomaly", "model_version")
    ordering = ("-normalized_score",)
    search_fields = ("event__message", "event__source_ip", "event__username")