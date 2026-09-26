from django.urls import path

from . import consumers


websocket_urlpatterns = [
    path("ws/incidents/", consumers.IncidentFeedConsumer.as_asgi()),
    path("ws/detections/", consumers.DetectionFeedConsumer.as_asgi()),
]
