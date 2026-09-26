import pytest


pytestmark = pytest.mark.django_db


def test_events_requires_auth(api_client):
    assert api_client.get("/api/events/").status_code == 401


def test_events_list_authenticated(viewer_client, sample_event):
    res = viewer_client.get("/api/events/")
    assert res.status_code == 200
    assert len(res.data) == 1
    assert res.data[0]["event_type"] == "LOGIN_FAILED"


def test_event_create(admin_client):
    payload = {
        "event_type": "PORT_SCAN",
        "severity": "HIGH",
        "source_ip": "10.0.0.5",
        "message": "pytest event",
    }
    res = admin_client.post("/api/events/", payload, format="json")
    assert res.status_code == 201
    assert res.data["severity"] == "HIGH"


def test_event_filter_by_severity(admin_client, sample_event):
    sample_event.severity = "CRITICAL"
    sample_event.save()

    res = admin_client.get("/api/events/?severity=CRITICAL")
    assert res.status_code == 200
    assert len(res.data) == 1
