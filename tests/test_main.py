"""Tests for main FastAPI application."""

from fastapi.testclient import TestClient


def test_health_endpoint(authorized_client: TestClient) -> None:
    resp = authorized_client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
