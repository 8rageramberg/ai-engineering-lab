"""Basic sanity tests for the backend API endpoints."""


def test_health_check(client):
    """Verify the health check endpoint returns 200."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_system_status(client):
    """Verify the system status endpoint is reachable."""
    response = client.get("/api/system-status")
    assert response.status_code == 200
    data = response.json()
    # Just verify the structure; we're testing reachability, not correctness.
    assert isinstance(data, dict)
