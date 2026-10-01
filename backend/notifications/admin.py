from django.contrib import admin

from .models import NotificationChannel, NotificationLog


@admin.register(NotificationChannel)
class NotificationChannelAdmin(admin.ModelAdmin):
    list_display = ("name", "channel_type", "enabled", "auto_notify", "min_severity", "updated_at")
    list_filter = ("channel_type", "enabled", "auto_notify", "min_severity")
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ("channel", "incident", "success", "sent_at")
    list_filter = ("channel", "success")
    ordering = ("-sent_at",)
    readonly_fields = ("channel", "incident", "success", "payload_preview", "error", "sent_at")
