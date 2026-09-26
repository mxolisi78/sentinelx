from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AnomalyScoreViewSet, score_events, train_model


router = DefaultRouter()
router.register(r"ml/anomaly-scores", AnomalyScoreViewSet, basename="anomaly-score")

urlpatterns = [
    path("ml/train/", train_model, name="ml-train"),
    path("ml/score/", score_events, name="ml-score"),
] + router.urls
