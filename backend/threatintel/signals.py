"""
Auto-enrichment hooks.

When a SecurityEvent is created, look up its source IP and cache the
result. Enrichment failures must never block event creation, so every
lookup is wrapped in try/except and logged.
"""

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from events.models import SecurityEvent

from .services import enrich_ip


logger = logging.getLogger(__name__)


@receiver(post_save, sender=SecurityEvent)
def enrich_event_source_ip(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.source_ip:
        return
    try:
        enrich_ip(instance.source_ip)
    except Exception as exc:
        logger.warning("Failed to enrich IP %s: %s", instance.source_ip, exc)
