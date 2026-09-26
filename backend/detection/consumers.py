"""
WebSocket consumers for real-time SentinelX updates.

All activity flows through the sentinelx_activity group so the frontend
needs only one connection per tab. The message payload's "event" field
discriminates the update type.
"""

import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer


logger = logging.getLogger(__name__)
ACTIVITY_GROUP = "sentinelx_activity"


class ActivityFeedConsumer(AsyncWebsocketConsumer):
    group_name = ACTIVITY_GROUP

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            # Reject cleanly. Daphne is happy with this at the consumer level.
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Be defensive: role may or may not exist depending on user type
        role = getattr(user, "role", None)
        username = getattr(user, "username", None)

        try:
            await self.send(
                text_data=json.dumps(
                    {
                        "event": "connected",
                        "group": self.group_name,
                        "user": username,
                        "role": role,
                    }
                )
            )
        except Exception as exc:
            logger.exception("Failed to send connected message: %s", exc)

    async def disconnect(self, code):
        try:
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )
        except Exception:
            pass

    async def feed_message(self, event):
        await self.send(text_data=json.dumps(event["payload"]))


# Legacy aliases ? same consumer, same group.
class IncidentFeedConsumer(ActivityFeedConsumer):
    pass


class DetectionFeedConsumer(ActivityFeedConsumer):
    pass
