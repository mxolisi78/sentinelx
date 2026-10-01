from django.contrib import admin

from .models import Playbook, PlaybookExecution


@admin.register(Playbook)
class PlaybookAdmin(admin.ModelAdmin):
    list_display = ("name", "enabled", "trigger", "updated_at")
    list_filter = ("enabled",)
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")


@admin.register(PlaybookExecution)
class PlaybookExecutionAdmin(admin.ModelAdmin):
    list_display = ("playbook", "incident", "success", "executed_at")
    list_filter = ("success", "playbook")
    ordering = ("-executed_at",)
    readonly_fields = ("playbook", "incident", "success", "actions_run", "error", "executed_at")
