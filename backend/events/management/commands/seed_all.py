from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = "Bootstrap the SentinelX demo data on a fresh deployment."

    def handle(self, *args, **options):
        self.stdout.write("==> Seeding security events...")
        call_command("seed_events", count=40, clear=True)

        self.stdout.write("==> Seeding threat intelligence...")
        call_command("seed_threatintel", clear=True)

        self.stdout.write("==> Training ML anomaly detector...")
        try:
            call_command("train_anomaly")
            call_command("score_events", all=True)
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"ML training skipped: {exc}"))

        self.stdout.write("==> Running detection engine...")
        call_command("run_detection", all=True)

        self.stdout.write(self.style.SUCCESS("Demo data seeded."))
