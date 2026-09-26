"""
Shared pytest fixtures for SentinelX.
"""

import pytest
from rest_framework.test import APIClient

from accounts.models import User
from events.models import SecurityEvent


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    u = User.objects.create_user(
        username="test_admin",
        password="testpass123",
        email="admin@test.local",
        role="ADMIN",
    )
    u.is_staff = True
    u.is_superuser = True
    u.save()
    return u


@pytest.fixture
def analyst_user(db):
    return User.objects.create_user(
        username="test_analyst",
        password="testpass123",
        email="analyst@test.local",
        role="ANALYST",
    )


@pytest.fixture
def viewer_user(db):
    return User.objects.create_user(
        username="test_viewer",
        password="testpass123",
        email="viewer@test.local",
        role="VIEWER",
    )


def _client_with_credentials(username, password):
    """Create a fresh APIClient authenticated as the given user."""
    client = APIClient()
    res = client.post(
        "/api/auth/login/",
        {"username": username, "password": password},
        format="json",
    )
    assert res.status_code == 200, f"Login failed: {res.content}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return client


@pytest.fixture
def admin_client(admin_user):
    return _client_with_credentials("test_admin", "testpass123")


@pytest.fixture
def analyst_client(analyst_user):
    return _client_with_credentials("test_analyst", "testpass123")


@pytest.fixture
def viewer_client(viewer_user):
    return _client_with_credentials("test_viewer", "testpass123")


@pytest.fixture
def sample_event(db):
    return SecurityEvent.objects.create(
        event_type="LOGIN_FAILED",
        severity="MEDIUM",
        source_ip="192.168.1.99",
        username="alice",
        device="WS-TEST-01",
        location="Test Lab",
        message="Unit-test event",
    )
