from django.core.management.base import BaseCommand

from events.models import SecurityEvent
from ml.detector import get_detector
from ml.models import AnomalyScore


class Command(BaseCommand):
    help = "Run the ML anomaly detector over security events."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Rescore every event (default: only unscored).",
        )

    def handle(self, *args, **options):
        detector = get_detector()
        if not detector.is_trained:
            self.stderr.write(
                self.style.ERROR("Model not trained. Run `train_anomaly` first.")
            )
            return

        if options["all"]:
            qs = SecurityEvent.objects.all()
        else:
            qs = SecurityEvent.objects.filter(anomaly_score__isnull=True)

        events = list(qs)
        if not events:
            self.stdout.write("Nothing to score.")
            return

        self.stdout.write(f"Scoring {len(events)} events...")
        results = detector.score_many(events)

        anomalies = 0
        for event, raw, normalized, is_anomaly in results:
            AnomalyScore.objects.update_or_create(
                event=event,
                defaults={
                    "score": raw,
                    "normalized_score": normalized,
                    "is_anomaly": is_anomaly,
                },
            )
            if is_anomaly:
                anomalies += 1

        self.stdout.write(self.style.SUCCESS("Scoring complete."))
        self.stdout.write(f"  Scored    : {len(results)}")
        self.stdout.write(f"  Anomalies : {anomalies}")
