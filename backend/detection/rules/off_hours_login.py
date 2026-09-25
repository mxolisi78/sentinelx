from .base import BaseRule, Finding


class OffHoursAdminLoginRule(BaseRule):
    """
    Fires on a successful login by a privileged user outside business hours
    (08:00-18:00, Monday-Friday).
    """

    name = "OFF_HOURS_ADMIN_LOGIN"
    description = "Successful privileged login outside business hours."
    PRIVILEGED_USERS = {"admin", "root", "administrator"}
    START_HOUR = 8
    END_HOUR = 18

    def evaluate(self, event):
        if event.event_type != "LOGIN_SUCCESS":
            return []

        username = (event.username or "").lower()
        if username not in self.PRIVILEGED_USERS:
            return []

        ts = event.timestamp
        is_weekend = ts.weekday() >= 5
        is_off_hours = ts.hour < self.START_HOUR or ts.hour >= self.END_HOUR

        if not (is_weekend or is_off_hours):
            return []

        when = "weekend" if is_weekend else "outside business hours"
        return [
            Finding(
                rule_name=self.name,
                confidence=70,
                reason=(
                    f"Privileged user '{username}' logged in {when} "
                    f"({ts.strftime('%A %H:%M')})."
                ),
                risk_bump=25,
                mark_anomaly=True,
                metadata={"username": username, "hour": ts.hour},
            )
        ]