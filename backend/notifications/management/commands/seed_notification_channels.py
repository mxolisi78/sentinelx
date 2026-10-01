"""
Seed demo notification channels.

Creates:
  - "Ops Slack"         ? SLACK, disabled, placeholder webhook (edit the URL in admin)
  - "Security Email"    ? EMAIL, enabled, auto_notify for HIGH+ (uses console backend in dev)
"""

from django.core.management.base import BaseCommand

from notifications.models import NotificationChannel


DEMO = [
    {
        "name": "Security Email",
        "channel_type": "EMAIL",
        "config": {"recipients": ["security@example.com"]},
        "enabled": True,
        "auto_notify": True,
        "min_severity": "HIGH",
    },
    {
        "name": "Ops Slack",
        "channel_type": "SLACK",
        "config": {"webhook_url": "https://hooks.slack.com/services/REPLACE/ME/HERE"},
        "enabled": False,
        "auto_notify": True,
        "min_severity": "CRITICAL",
    },
]


class Command(BaseCommand):
    help = "Seed demo notification channels."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true")

    def handle(self, *args, **options):
        if options["clear"]:
            NotificationChannel.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing channels."))

        created = 0
        for spec in DEMO:
            _, was_created = NotificationChannel.objects.update_or_create(
                name=spec["name"], defaults=spec
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} new channels."))
        self.stdout.write(f"Total channels: {NotificationChannel.objects.count()}")
