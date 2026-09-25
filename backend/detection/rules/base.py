"""
Base class for all SentinelX detection rules.

A rule receives a SecurityEvent and returns a list of Finding objects.
Returning [] means the rule did not fire.
"""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Finding:
    """
    The output of a rule that fired against a single event.
    """
    rule_name: str
    confidence: int                     # 0-100
    reason: str
    risk_bump: int = 0                  # how much to add to event.risk_score
    mark_anomaly: bool = False          # force is_anomaly = True
    metadata: dict = field(default_factory=dict)


class BaseRule:
    """
    Every detection rule subclasses this and implements `evaluate(event)`.
    """

    name: str = "BASE_RULE"
    description: str = ""

    def evaluate(self, event) -> List[Finding]:
        raise NotImplementedError

    @staticmethod
    def is_private_ip(ip: Optional[str]) -> bool:
        """Return True for RFC1918 / loopback / link-local addresses."""
        if not ip:
            return True
        return (
            ip.startswith("10.")
            or ip.startswith("192.168.")
            or ip.startswith("127.")
            or ip.startswith("169.254.")
            or any(ip.startswith(f"172.{n}.") for n in range(16, 32))
        )