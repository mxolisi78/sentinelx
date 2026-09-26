from rest_framework.routers import DefaultRouter

from .views import IOCViewSet, IPReputationViewSet


router = DefaultRouter()
router.register(r"threatintel/reputations", IPReputationViewSet, basename="ip-reputation")
router.register(r"threatintel/iocs", IOCViewSet, basename="ioc")

urlpatterns = router.urls
