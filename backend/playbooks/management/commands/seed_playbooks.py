"""
Seed a set of realistic SentinelX response playbooks.
"""

from django.core.management.base import BaseCommand

from playbooks.models import Playbook


DEMO_PLAYBOOKS = [
    {
        "name": "Auto-Escalate Critical Incidents",
        "description": (
            "Any incident marked CRITICAL is immediately moved to INVESTIGATING "
            "and annotated for review."
        ),
        "trigger": {"type": "SEVERITY", "value": "CRITICAL"},
        "actions": [
            {"type": "SET_STATUS", "value": "INVESTIGATING"},
            {"type": "ADD_NOTE", "value": "Auto-escalated by playbook: CRITICAL severity requires immediate review."},
        ],
    },
    {
        "name": "Tor Exit Triage",
        "description": (
            "When a source IP is a known Tor exit node, add triage context "
            "to the incident."
        ),
        "trigger": {"type": "IP_CATEGORY", "value": "TOR_EXIT"},
        "actions": [
            {"type": "ADD_NOTE", "value": "Source IP matches documented Tor exit node. Consider blocking or geofencing."},
            {"type": "SET_SEVERITY", "value": "HIGH"},
        ],
    },
    {
        "name": "Privilege Escalation Review",
        "description": (
            "Any PRIVILEGE_ESCALATION detection is auto-assigned to admin "
            "for review."
        ),
        "trigger": {"type": "RULE", "value": "PRIVILEGE_ESCALATION"},
        "actions": [
            {"type": "ASSIGN_TO", "value": "admin"},
            {"type": "ADD_NOTE", "value": "Auto-assigned by playbook: privilege escalation requires analyst review."},
        ],
    },
    {
        "name": "Brute Force High-Risk Alert",
        "description": (
            "When a brute force detection has a very high combined risk score, "
            "surface it as a HIGH severity incident."
        ),
        "trigger": {"type": "MIN_RISK", "value": 70},
        "actions": [
            {"type": "SET_SEVERITY", "value": "HIGH"},
            {"type": "ADD_NOTE", "value": "High combined risk score triggered by ML + rule ensemble."},
        ],
    },
]


class Command(BaseCommand):
    help = "Seed demo response playbooks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete existing playbooks first.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            Playbook.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared existing playbooks."))

        created = 0
        for spec in DEMO_PLAYBOOKS:
            _, was_created = Playbook.objects.update_or_create(
                name=spec["name"],
                defaults=spec,
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} new playbooks."))
        self.stdout.write(f"Total playbooks: {Playbook.objects.count()}")
