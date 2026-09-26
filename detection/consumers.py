"""
WebSocket consumers for real-time SentinelX updates.

All real-time activity flows through a single group (sentinelx_activity)
so the frontend only needs one WebSocket connection per tab. The message
payload's "event" field discriminates the type of update.
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer


ACTIVITY_GROUP = "sentinelx_activity"


class ActivityFeedConsumer(AsyncWebsocketConsumer):
    group_name = ACTIVITY_GROUP

    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(
            text_data=json.dumps(
                {
                    "event": "connected",
                    "group": self.group_name,
                    "user": user.username,
                    "role": user.role,
                }
            )
        )

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def feed_message(self, event):
        """Handler fired when group_send broadcasts type=feed.message."""
        await self.send(text_data=json.dumps(event["payload"]))


# Legacy aliases keep the old /ws/incidents/ and /ws/detections/ URLs
# working. They now both deliver every activity message.
class IncidentFeedConsumer(ActivityFeedConsumer):
    pass


class DetectionFeedConsumer(ActivityFeedConsumer):
    pass