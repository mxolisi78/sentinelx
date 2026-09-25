from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DetectionViewSet, analyze_events


router = DefaultRouter()
router.register(r"detections", DetectionViewSet, basename="detection")

urlpatterns = [
    path("events/analyze/", analyze_events, name="analyze-events"),
] + router.urls