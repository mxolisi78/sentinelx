from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from accounts.views import SentinelXLoginView


def home(request):
    return JsonResponse({
        "name": "SentinelX Cyber Defense Platform",
        "status": "online",
        "version": "0.1.0",
        "message": "SentinelX API is running.",
    })


urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),

    # Auth
    path("api/auth/login/", SentinelXLoginView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # Domain APIs
    path("api/", include("accounts.urls")),
    path("api/", include("incidents.urls")),
    path("api/", include("detection.urls")),  # before events
    path("api/", include("ml.urls")),
    path("api/", include("threatintel.urls")),
    path("api/", include("events.urls")),
    path("api/", include("analytics.urls")),
    path("api/", include("playbooks.urls")),
]
