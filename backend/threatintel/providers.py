"""
Pluggable IP reputation providers.

Each provider exposes lookup(ip) -> dict with the shape we can store
on IPReputation. The default provider is a local seeded dataset so
SentinelX works offline.
"""

import ipaddress
import random
from typing import Optional


class BaseProvider:
    name = "base"

    def lookup(self, ip: str) -> Optional[dict]:
        raise NotImplementedError


class LocalSeedProvider(BaseProvider):
    """
    Deterministic, offline reputation provider.

    Check order matters:
      1. Documented TEST-NET ranges (203.0.113.x, 198.51.100.x) ? SUSPICIOUS
      2. Documented Tor range (185.220.101.x)                    ? TOR_EXIT
      3. RFC1918 / loopback / link-local                         ? CLEAN
      4. Anything else                                            ? deterministic
    """

    name = "seed"

    def lookup(self, ip: str) -> Optional[dict]:
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            return None

        rng = random.Random(ip)

        # 1. TEST-NET ? check BEFORE is_private (Python treats these as reserved)
        if ip.startswith("203.0.113.") or ip.startswith("198.51.100."):
            return {
                "category": "SUSPICIOUS",
                "abuse_score": rng.randint(40, 70),
                "report_count": rng.randint(10, 80),
                "country": "US",
                "asn": "AS64500",
                "asn_owner": "TEST-NET Example Corp",
                "source": "seed",
            }

        # 2. Documented Tor exit range
        if ip.startswith("185.220.101."):
            return {
                "category": "TOR_EXIT",
                "abuse_score": 85,
                "report_count": rng.randint(400, 1200),
                "country": "DE",
                "asn": "AS208294",
                "asn_owner": "ForPrivacyNET",
                "source": "seed",
            }

        # 3. RFC1918 / loopback / link-local
        if addr.is_private or addr.is_loopback or addr.is_link_local:
            return {
                "category": "CLEAN",
                "abuse_score": 0,
                "report_count": 0,
                "country": "ZZ",
                "asn": None,
                "asn_owner": "Private Network",
                "source": "seed",
            }

        # 4. Any other public IP: derive a plausible classification
        roll = rng.random()
        if roll < 0.6:
            return {
                "category": "CLEAN",
                "abuse_score": rng.randint(0, 15),
                "report_count": rng.randint(0, 5),
                "country": "US",
                "asn": f"AS{rng.randint(1000, 65000)}",
                "asn_owner": "Generic ISP",
                "source": "seed",
            }
        if roll < 0.85:
            return {
                "category": "SUSPICIOUS",
                "abuse_score": rng.randint(30, 60),
                "report_count": rng.randint(5, 50),
                "country": "RU",
                "asn": f"AS{rng.randint(1000, 65000)}",
                "asn_owner": "Bulletproof Hosting LLC",
                "source": "seed",
            }
        return {
            "category": "MALICIOUS",
            "abuse_score": rng.randint(75, 100),
            "report_count": rng.randint(50, 500),
            "country": "CN",
            "asn": f"AS{rng.randint(1000, 65000)}",
            "asn_owner": "Known Bad Network",
            "source": "seed",
        }


_active_provider = LocalSeedProvider()


def get_provider() -> BaseProvider:
    return _active_provider


def set_provider(provider: BaseProvider):
    global _active_provider
    _active_provider = provider
