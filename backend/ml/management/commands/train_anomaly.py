from django.core.management.base import BaseCommand

from ml.detector import get_detector


class Command(BaseCommand):
    help = "Train the SentinelX ML anomaly detector on the event corpus."

    def add_arguments(self, parser):
        parser.add_argument(
            "--contamination",
            type=float,
            default=0.05,
            help="Expected fraction of outliers (default 0.05).",
        )

    def handle(self, *args, **options):
        detector = get_detector()
        self.stdout.write("Training IsolationForest...")
        stats = detector.train(contamination=options["contamination"])
        self.stdout.write(self.style.SUCCESS("Training complete."))
        self.stdout.write(f"  Events used  : {stats['trained_on']}")
        self.stdout.write(f"  Contamination: {stats['contamination']}")
        self.stdout.write(f"  Model saved  : {detector.is_trained}")
