"""
Low-level notification senders.

Each sender takes a channel + a message dict and returns a result dict
with `success: bool` and either `preview: str` or `error: str`.
"""

import json
import logging

import requests
from django.conf import settings
from django.core.mail import send_mail


logger = logging.getLogger(__name__)


def _preview(text, limit=200):
    text = str(text)
    return text[:limit] + ("?" if len(text) > limit else "")


def send_slack(channel, message):
    """
    message: {"title": "...", "body": "...", "severity": "HIGH", "url": "..."}
    """
    webhook_url = (channel.config or {}).get("webhook_url")
    if not webhook_url:
        return {"success": False, "error": "webhook_url missing"}

    # Slack blocks payload with color-coded severity
    color = {
        "CRITICAL": "#ef4444",
        "HIGH": "#f97316",
        "MEDIUM": "#eab308",
        "LOW": "#22c55e",
    }.get(message.get("severity"), "#94a3b8")

    payload = {
        "attachments": [
            {
                "color": color,
                "title": message.get("title", "SentinelX alert"),
                "text": message.get("body", ""),
                "footer": "SentinelX",
                "ts": None,
            }
        ]
    }

    try:
        resp = requests.post(webhook_url, json=payload, timeout=8)
        ok = resp.status_code < 400
        if ok:
            return {"success": True, "preview": _preview(json.dumps(payload))}
        return {
            "success": False,
            "error": f"HTTP {resp.status_code}: {resp.text[:200]}",
        }
    except Exception as exc:
        logger.exception("Slack send failed")
        return {"success": False, "error": str(exc)}


def send_email(channel, message):
    """
    Uses Django's configured EMAIL_BACKEND.
    In dev this is the console backend; in prod it's SMTP.
    """
    recipients = (channel.config or {}).get("recipients") or []
    if not recipients:
        return {"success": False, "error": "no recipients configured"}

    subject = f"[SentinelX] {message.get('severity', 'ALERT')}: {message.get('title', 'Alert')}"
    body = message.get("body", "")

    try:
        sent = send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )
        if sent:
            return {"success": True, "preview": _preview(f"to {recipients}: {subject}")}
        return {"success": False, "error": "send_mail returned 0"}
    except Exception as exc:
        logger.exception("Email send failed")
        return {"success": False, "error": str(exc)}


SENDERS = {
    "SLACK": send_slack,
    "EMAIL": send_email,
}


def dispatch(channel, message):
    """Route the message to the correct sender for the channel type."""
    sender = SENDERS.get(channel.channel_type)
    if not sender:
        return {"success": False, "error": f"unknown channel type {channel.channel_type}"}
    return sender(channel, message)
