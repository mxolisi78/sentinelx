from rest_framework.routers import DefaultRouter
from .views import SecurityEventViewSet


router = DefaultRouter()

router.register(
    r"events",
    SecurityEventViewSet,
    basename="security-event"
)

urlpatterns = router.urls