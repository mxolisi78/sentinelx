from django.core.management.base import BaseCommand

from incidents.models import Incident
from incidents.factory import _build_description


class Command(BaseCommand):
    help = "Refresh incident descriptions to include threat intel."

    def handle(self, *args, **options):
        updated = 0
        for inc in Incident.objects.prefetch_related("detections__event"):
            det = inc.detections.first()
            if not det:
                continue
            new_desc = _build_description(det)
            if new_desc != inc.description:
                inc.description = new_desc
                inc.save(update_fields=["description", "updated_at"])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} incident descriptions."))
