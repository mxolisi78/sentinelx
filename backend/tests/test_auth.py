import pytest


pytestmark = pytest.mark.django_db


def test_login_returns_tokens(api_client, admin_user):
    res = api_client.post(
        "/api/auth/login/",
        {"username": "test_admin", "password": "testpass123"},
        format="json",
    )
    assert res.status_code == 200
    assert "access" in res.data
    assert "refresh" in res.data


def test_login_wrong_password_rejected(api_client, admin_user):
    res = api_client.post(
        "/api/auth/login/",
        {"username": "test_admin", "password": "wrong"},
        format="json",
    )
    assert res.status_code == 401


def test_me_requires_auth(api_client):
    res = api_client.get("/api/auth/me/")
    assert res.status_code == 401


def test_me_returns_current_user(admin_client, admin_user):
    res = admin_client.get("/api/auth/me/")
    assert res.status_code == 200
    assert res.data["username"] == "test_admin"
    assert res.data["role"] == "ADMIN"


def test_users_endpoint_admin_only(admin_client, viewer_client):
    assert admin_client.get("/api/users/").status_code == 200
    assert viewer_client.get("/api/users/").status_code == 403
