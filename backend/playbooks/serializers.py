from rest_framework import serializers

from .models import Playbook, PlaybookExecution


class PlaybookExecutionSerializer(serializers.ModelSerializer):
    playbook_name = serializers.CharField(source="playbook.name", read_only=True)
    incident_title = serializers.CharField(source="incident.title", read_only=True)

    class Meta:
        model = PlaybookExecution
        fields = (
            "id",
            "playbook",
            "playbook_name",
            "incident",
            "incident_title",
            "success",
            "actions_run",
            "error",
            "executed_at",
        )
        read_only_fields = fields


class PlaybookSerializer(serializers.ModelSerializer):
    execution_count = serializers.SerializerMethodField()

    class Meta:
        model = Playbook
        fields = (
            "id",
            "name",
            "description",
            "enabled",
            "trigger",
            "actions",
            "execution_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "execution_count", "created_at", "updated_at")

    def get_execution_count(self, playbook):
        return playbook.executions.count()
