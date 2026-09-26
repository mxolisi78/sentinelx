"""
Enrichment service.

Responsible for:
- Looking up an IP in the local IPReputation cache
- Fetching from the active provider on cache miss
- Refreshing stale entries
- Attaching reputation info to events / incidents
"""

from datetime import timedelta

from django.utils import timezone

from .models import IPReputation
from .providers import get_provider


# Re-fetch if a cached entry is older than this
CACHE_TTL = timedelta(hours=24)


def enrich_ip(ip: str, force_refresh: bool = False) -> IPReputation | None:
    """
    Return an IPReputation for the given IP.

    Uses the cache unless the entry is missing or stale (or force_refresh
    is True), in which case it queries the active provider and upserts.
    """
    if not ip:
        return None

    cached = IPReputation.objects.filter(ip=ip).first()
    stale = cached and (timezone.now() - cached.fetched_at) > CACHE_TTL

    if cached and not force_refresh and not stale:
        return cached

    provider = get_provider()
    data = provider.lookup(ip)
    if not data:
        return cached

    rep, _ = IPReputation.objects.update_or_create(
        ip=ip,
        defaults={
            "category": data.get("category", "UNKNOWN"),
            "abuse_score": data.get("abuse_score", 0),
            "report_count": data.get("report_count", 0),
            "country": data.get("country"),
            "asn": data.get("asn"),
            "asn_owner": data.get("asn_owner"),
            "source": data.get("source", provider.name),
            "last_seen": timezone.now(),
        },
    )
    return rep


def enrich_many(ips: list[str], force_refresh: bool = False) -> dict[str, IPReputation]:
    """Enrich a batch of IPs. Returns a dict of ip -> IPReputation."""
    out = {}
    for ip in set(filter(None, ips)):
        rep = enrich_ip(ip, force_refresh=force_refresh)
        if rep:
            out[ip] = rep
    return out


def summary_for_ip(ip: str) -> dict:
    """Compact dict for embedding in API responses."""
    rep = IPReputation.objects.filter(ip=ip).first()
    if not rep:
        return {"ip": ip, "known": False}
    return {
        "ip": ip,
        "known": True,
        "category": rep.category,
        "abuse_score": rep.abuse_score,
        "report_count": rep.report_count,
        "country": rep.country,
        "asn": rep.asn,
        "asn_owner": rep.asn_owner,
        "risk_level": rep.risk_level,
    }
