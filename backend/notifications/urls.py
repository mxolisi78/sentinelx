from rest_framework.routers import DefaultRouter

from .views import NotificationChannelViewSet, NotificationLogViewSet


router = DefaultRouter()
router.register(r"notifications/channels", NotificationChannelViewSet, basename="notification-channel")
router.register(r"notifications/logs", NotificationLogViewSet, basename="notification-log")

urlpatterns = router.urls
