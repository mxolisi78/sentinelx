from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import UserViewSet, current_user


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    path("auth/me/", current_user, name="current-user"),
] + router.urls