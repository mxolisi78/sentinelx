"""
WebSocket consumers for real-time SentinelX updates.

Each authenticated user joins a broadcast group. When the backend
creates an incident or detection, it publishes to that group, and every
connected client receives the payload immediately.
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer


class BaseFeedConsumer(AsyncWebsocketConsumer):
    group_name = "sentinelx_feed"

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
                    "type": "connected",
                    "group": self.group_name,
                    "user": user.username,
                }
            )
        )

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def feed_message(self, event):
        """Handler called when group_send fires with type=feed.message."""
        await self.send(text_data=json.dumps(event["payload"]))


class IncidentFeedConsumer(BaseFeedConsumer):
    group_name = "sentinelx_incidents"


class DetectionFeedConsumer(BaseFeedConsumer):
    group_name = "sentinelx_detections"
