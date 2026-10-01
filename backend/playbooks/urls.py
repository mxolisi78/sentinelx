from rest_framework.routers import DefaultRouter

from .views import PlaybookExecutionViewSet, PlaybookViewSet


router = DefaultRouter()
router.register(r"playbooks", PlaybookViewSet, basename="playbook")
router.register(r"playbook-executions", PlaybookExecutionViewSet, basename="playbook-execution")

urlpatterns = router.urls
