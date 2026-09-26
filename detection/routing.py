from django.urls import path

from . import consumers


websocket_urlpatterns = [
    path("ws/activity/", consumers.ActivityFeedConsumer.as_asgi()),
    # Legacy endpoints now route to the same consumer
    path("ws/incidents/", consumers.IncidentFeedConsumer.as_asgi()),
    path("ws/detections/", consumers.DetectionFeedConsumer.as_asgi()),
]