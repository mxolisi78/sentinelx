from django.urls import path

from .views import summary


urlpatterns = [
    path("analytics/summary/", summary, name="analytics-summary"),
]
