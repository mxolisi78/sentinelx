"""
Threat intelligence data models.

IPReputation caches reputation data for a single IP. We keep it separate
from SecurityEvent so the same IP is looked up once and reused across
all events and incidents that reference it.

IOC records individual Indicators of Compromise (bad IPs, domains, hashes)
with metadata for correlation.
"""

from django.db import models
from django.utils import timezone


class IPReputation(models.Model):

    CATEGORY_CHOICES = [
        ("CLEAN", "Clean"),
        ("SUSPICIOUS", "Suspicious"),
        ("MALICIOUS", "Malicious"),
        ("SCANNER", "Scanner"),
        ("TOR_EXIT", "Tor Exit Node"),
        ("PROXY", "Proxy / VPN"),
        ("BOTNET", "Botnet C2"),
        ("SPAM", "Spam Source"),
        ("UNKNOWN", "Unknown"),
    ]

    ip = models.GenericIPAddressField(unique=True, db_index=True)

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default="UNKNOWN",
    )

    # 0-100, higher = more dangerous
    abuse_score = models.IntegerField(default=0)

    # How many independent reports contributed to this rating
    report_count = models.IntegerField(default=0)

    country = models.CharField(max_length=2, null=True, blank=True)
    asn = models.CharField(max_length=32, null=True, blank=True)
    asn_owner = models.CharField(max_length=255, null=True, blank=True)

    # Where this data came from: "seed", "manual", "abuseipdb", etc.
    source = models.CharField(max_length=32, default="seed")

    last_seen = models.DateTimeField(null=True, blank=True)
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-abuse_score", "-fetched_at"]
        verbose_name_plural = "IP reputations"
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["-abuse_score"]),
        ]

    def __str__(self):
        return f"{self.ip} ({self.category}, score={self.abuse_score})"

    @property
    def is_malicious(self):
        return self.category in ("MALICIOUS", "BOTNET", "SPAM")

    @property
    def is_suspicious(self):
        return self.category in ("SUSPICIOUS", "SCANNER", "TOR_EXIT", "PROXY")

    @property
    def risk_level(self):
        if self.abuse_score >= 75 or self.is_malicious:
            return "CRITICAL"
        if self.abuse_score >= 50 or self.is_suspicious:
            return "HIGH"
        if self.abuse_score >= 25:
            return "MEDIUM"
        return "LOW"


class IOC(models.Model):

    IOC_TYPES = [
        ("IP", "IP Address"),
        ("DOMAIN", "Domain"),
        ("URL", "URL"),
        ("HASH_MD5", "MD5 Hash"),
        ("HASH_SHA256", "SHA256 Hash"),
        ("EMAIL", "Email"),
    ]

    ioc_type = models.CharField(max_length=20, choices=IOC_TYPES)
    value = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=20,
        choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High"), ("CRITICAL", "Critical")],
        default="MEDIUM",
    )
    source = models.CharField(max_length=64, blank=True, default="")
    tags = models.CharField(max_length=255, blank=True, default="")

    first_seen = models.DateTimeField(default=timezone.now)
    last_seen = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["ioc_type", "value"],
                name="unique_ioc_type_value",
            ),
        ]
        indexes = [
            models.Index(fields=["ioc_type", "value"]),
        ]

    def __str__(self):
        return f"{self.ioc_type}:{self.value}"
