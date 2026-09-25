import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from events.models import SecurityEvent


SAMPLE_USERS = [
    "admin", "j.smith", "a.mokoena", "s.patel", "root",
    "svc_backup", "m.nguyen", "unknown",
]

SAMPLE_IPS = [
    "192.168.1.10", "192.168.1.45", "10.0.0.22", "10.0.0.91",
    "172.16.5.7", "203.0.113.44", "198.51.100.9", "185.220.101.5",
]

SAMPLE_DEVICES = [
    "WS-ADMIN-01", "WS-DEV-07", "SRV-DB-02", "SRV-WEB-01",
    "LAP-EXEC-03", "FW-EDGE-01", "UNKNOWN-DEVICE",
]

SAMPLE_LOCATIONS = [
    "Johannesburg", "Cape Town", "London", "Frankfurt",
    "New York", "Singapore", "Unknown", "Moscow",
]

SAMPLE_MESSAGES = {
    "LOGIN_FAILED": [
        "Multiple failed authentication attempts detected",
        "Repeated failed login from unfamiliar IP",
        "Failed login after password reset",
    ],
    "LOGIN_SUCCESS": [
        "Successful login from new device",
        "Successful login outside business hours",
        "Successful login after 3 failed attempts",
    ],
    "PRIVILEGE_CHANGE": [
        "User added to Domain Admins group",
        "Sudo privileges granted to non-admin user",
        "Role elevated from Viewer to Analyst",
    ],
    "SUSPICIOUS_REQUEST": [
        "Unusual API request pattern detected",
        "Request to sensitive endpoint from unknown origin",
        "Abnormally high request rate from single source",
    ],
    "PORT_SCAN": [
        "Sequential port scan across 1000 ports",
        "SYN scan from external IP",
        "Nmap fingerprinting detected",
    ],
    "DATA_ACCESS": [
        "Bulk download of sensitive records",
        "Access to restricted file share",
        "Database export initiated outside policy",
    ],
    "FILE_ACTIVITY": [
        "Large file transfer to external destination",
        "Sensitive file renamed with .locked extension",
        "Unexpected archive created in user profile",
    ],
    "SYSTEM_EVENT": [
        "System service restarted unexpectedly",
        "Scheduled task modified",
        "Firewall rule changed",
    ],
    "OTHER": [
        "Unclassified security event",
        "Informational log entry",
    ],
}


class Command(BaseCommand):
    help = "Seed the database with realistic SecurityEvents for development."

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=40,
            help="How many events to create (default: 40).",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing events before seeding.",
        )

    def handle(self, *args, **options):
        count = options["count"]

        if options["clear"]:
            deleted, _ = SecurityEvent.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted} existing events."))

        event_types = list(SAMPLE_MESSAGES.keys())
        severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        severity_weights = [0.5, 0.3, 0.15, 0.05]  # realistic distribution

        now = timezone.now()
        created = 0

        for i in range(count):
            event_type = random.choice(event_types)
            severity = random.choices(severities, weights=severity_weights, k=1)[0]

            # Risk score correlated with severity
            risk_base = {"LOW": 10, "MEDIUM": 40, "HIGH": 70, "CRITICAL": 90}[severity]
            risk_score = min(100, max(0, risk_base + random.randint(-10, 10)))

            # Anomaly flag correlated with high severity
            is_anomaly = severity in ("HIGH", "CRITICAL") and random.random() < 0.7

            # Spread events across the last 72 hours
            timestamp = now - timedelta(minutes=random.randint(1, 72 * 60))

            event = SecurityEvent.objects.create(
                event_type=event_type,
                severity=severity,
                source_ip=random.choice(SAMPLE_IPS),
                username=random.choice(SAMPLE_USERS),
                device=random.choice(SAMPLE_DEVICES),
                location=random.choice(SAMPLE_LOCATIONS),
                message=random.choice(SAMPLE_MESSAGES[event_type]),
                is_anomaly=is_anomaly,
                risk_score=risk_score,
            )

            # Override auto_now_add timestamp so events spread across time
            SecurityEvent.objects.filter(pk=event.pk).update(timestamp=timestamp)
            created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully created {created} SecurityEvents.")
        )