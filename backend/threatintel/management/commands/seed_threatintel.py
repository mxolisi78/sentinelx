"""
Populate threat intel for all IPs referenced by existing events, plus
a handful of well-known IOCs.
"""

from django.core.management.base import BaseCommand

from events.models import SecurityEvent
from threatintel.models import IOC, IPReputation
from threatintel.services import enrich_ip


SAMPLE_IOCS = [
    ("IP", "185.220.101.5", "Documented Tor exit node", "HIGH", "manual", "tor,anonymizer"),
    ("IP", "203.0.113.44", "TEST-NET scanner range", "MEDIUM", "manual", "scanner"),
    ("DOMAIN", "malware-c2.example.com", "Known C2 domain", "CRITICAL", "manual", "c2,botnet"),
    ("DOMAIN", "phish-login.example.net", "Phishing landing page", "HIGH", "manual", "phishing"),
    ("HASH_SHA256", "5d41402abc4b2a76b9719d911017c592",
     "Example hash (hello)", "LOW", "manual", "example"),
    ("URL", "http://malware-c2.example.com/payload.bin",
     "Payload download URL", "CRITICAL", "manual", "c2,payload"),
    ("EMAIL", "attacker@malware-c2.example.com",
     "Attacker email", "HIGH", "manual", "phishing"),
]


class Command(BaseCommand):
    help = "Seed threat intelligence (IP reputations and IOCs)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing reputations and IOCs first.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            IPReputation.objects.all().delete()
            IOC.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing threat intel."))

        # Collect all source IPs referenced by events
        ips = list(
            SecurityEvent.objects
            .exclude(source_ip__isnull=True)
            .values_list("source_ip", flat=True)
            .distinct()
        )
        self.stdout.write(f"Enriching {len(ips)} unique source IPs...")

        count = 0
        for ip in ips:
            rep = enrich_ip(ip, force_refresh=True)
            if rep:
                count += 1

        self.stdout.write(self.style.SUCCESS(f"Enriched {count} IPs."))

        # Seed IOCs
        created_iocs = 0
        for ioc_type, value, description, severity, source, tags in SAMPLE_IOCS:
            _, created = IOC.objects.update_or_create(
                ioc_type=ioc_type,
                value=value,
                defaults={
                    "description": description,
                    "severity": severity,
                    "source": source,
                    "tags": tags,
                },
            )
            if created:
                created_iocs += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created_iocs} new IOCs."))
        self.stdout.write(f"Total reputations: {IPReputation.objects.count()}")
        self.stdout.write(f"Total IOCs: {IOC.objects.count()}")
