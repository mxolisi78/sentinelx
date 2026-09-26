import pytest

from incidents.models import Incident


pytestmark = pytest.mark.django_db


@pytest.fixture
def sample_incident(db):
    return Incident.objects.create(
        title="Test incident",
        description="pytest",
        severity="HIGH",
        status="OPEN",
    )


def test_incidents_requires_auth(api_client):
    assert api_client.get("/api/incidents/").status_code == 401


def test_viewer_can_list(viewer_client, sample_incident):
    res = viewer_client.get("/api/incidents/")
    assert res.status_code == 200
    assert len(res.data) == 1


def test_viewer_cannot_change_status(viewer_client, sample_incident):
    res = viewer_client.post(
        f"/api/incidents/{sample_incident.id}/status/",
        {"status": "RESOLVED"},
        format="json",
    )
    assert res.status_code == 403


def test_analyst_can_resolve(analyst_client, sample_incident):
    res = analyst_client.post(
        f"/api/incidents/{sample_incident.id}/status/",
        {"status": "RESOLVED", "resolution_notes": "done"},
        format="json",
    )
    assert res.status_code == 200
    assert res.data["status"] == "RESOLVED"
    sample_incident.refresh_from_db()
    assert sample_incident.resolved_at is not None


def test_assign_incident(analyst_client, analyst_user, sample_incident):
    res = analyst_client.post(
        f"/api/incidents/{sample_incident.id}/assign/",
        {"user_id": analyst_user.id},
        format="json",
    )
    assert res.status_code == 200
    assert res.data["assigned_to"] == analyst_user.id
