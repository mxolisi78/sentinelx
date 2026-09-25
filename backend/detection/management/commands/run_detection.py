from django.core.management.base import BaseCommand

from detection.engine import run_detection
from events.models import SecurityEvent


class Command(BaseCommand):
    help = "Run the SentinelX detection engine over security events."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Re-scan every event, even ones already analyzed.",
        )

    def handle(self, *args, **options):
        if options["all"]:
            qs = SecurityEvent.objects.all()
            self.stdout.write(self.style.WARNING("Re-scanning ALL events."))
        else:
            qs = SecurityEvent.objects.filter(detections__isnull=True).distinct()
            self.stdout.write("Scanning events with no prior detections.")

        report = run_detection(qs)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Detection run complete."))
        self.stdout.write(f"  Events scanned     : {report.events_scanned}")
        self.stdout.write(f"  Detections created : {report.detections_created}")
        self.stdout.write(f"  Events escalated   : {report.events_escalated}")
        self.stdout.write(f"  Duration           : {report.duration_ms} ms")
        if report.by_rule:
            self.stdout.write("  By rule:")
            for rule, count in sorted(report.by_rule.items()):
                self.stdout.write(f"    - {rule}: {count}")