import json


def test_home_returns_banner(db, api_client):
    res = api_client.get("/")
    assert res.status_code == 200
    payload = json.loads(res.content)
    assert payload["name"] == "SentinelX Cyber Defense Platform"
    assert payload["status"] == "online"
