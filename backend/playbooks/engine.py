"""
Playbook engine.

For each newly-created incident, evaluate all enabled playbooks in
order and execute the actions of any that match. Every execution is
recorded in PlaybookExecution.
"""

import logging

from .actions import run_action
from .models import Playbook, PlaybookExecution


logger = logging.getLogger(__name__)


def evaluate_trigger(trigger, incident):
    """
    Return True if the incident matches the playbook's trigger.

    Trigger shapes:
      {"type": "SEVERITY", "value": "CRITICAL"}
      {"type": "RULE", "value": "BRUTE_FORCE_LOGIN"}
      {"type": "IP_CATEGORY", "value": "TOR_EXIT"}
      {"type": "MIN_RISK", "value": 75}
    """
    ttype = trigger.get("type")
    tvalue = trigger.get("value")

    if ttype == "SEVERITY":
        return incident.severity == tvalue

    if ttype == "RULE":
        return incident.detections.filter(rule_name=tvalue).exists()

    if ttype == "IP_CATEGORY":
        # Look at the first linked detection's event source IP, then
        # check its reputation category.
        from threatintel.models import IPReputation
        first_detection = incident.detections.first()
        if not first_detection or not first_detection.event:
            return False
        ip = first_detection.event.source_ip
        if not ip:
            return False
        try:
            rep = IPReputation.objects.get(ip=ip)
        except IPReputation.DoesNotExist:
            return False
        return rep.category == tvalue

    if ttype == "MIN_RISK":
        try:
            threshold = int(tvalue)
        except (TypeError, ValueError):
            return False
        first_detection = incident.detections.first()
        if not first_detection or not first_detection.event:
            return False
        return (first_detection.event.combined_risk_score or 0) >= threshold

    return False


def execute_playbook(playbook, incident):
    """
    Run a single playbook against an incident. Returns the
    PlaybookExecution record.
    """
    log = []
    success = True
    error_msg = ""

    for action in playbook.actions or []:
        result = run_action(action, incident)
        log.append(result)
        # Check for failure strings in the result
        if isinstance(result, dict) and result.get("result", "").startswith("error"):
            success = False

    execution = PlaybookExecution.objects.create(
        playbook=playbook,
        incident=incident,
        success=success,
        actions_run=log,
        error=error_msg,
    )
    return execution


def run_playbooks_for_incident(incident):
    """
    Entry point called after incident creation.

    Returns the number of playbooks that executed.
    """
    count = 0
    for playbook in Playbook.objects.filter(enabled=True):
        try:
            if evaluate_trigger(playbook.trigger, incident):
                execute_playbook(playbook, incident)
                count += 1
        except Exception as exc:
            logger.exception(
                "Playbook '%s' failed on incident #%s: %s",
                playbook.name,
                incident.id,
                exc,
            )
            # Log the failure but keep processing other playbooks
            PlaybookExecution.objects.create(
                playbook=playbook,
                incident=incident,
                success=False,
                actions_run=[],
                error=str(exc),
            )

    if count:
        logger.info("Playbooks fired on incident #%s: %s", incident.id, count)

    return count
