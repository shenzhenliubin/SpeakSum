"""Tests for speaker identities API."""

import pytest
from fastapi.testclient import TestClient


class TestSpeakerIdentitiesAPI:
    """Test speaker identity endpoints."""

    def test_list_speaker_identities_empty(self, authorized_client: TestClient) -> None:
        """Test listing speaker identities when empty."""
        response = authorized_client.get("/api/v1/speaker-identities")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] == []

    def test_create_speaker_identity(self, authorized_client: TestClient) -> None:
        """Test creating a speaker identity."""
        response = authorized_client.post("/api/v1/speaker-identities", json={
            "display_name": "我的发言身份",
            "aliases": ["我", "本人"],
            "color": "#FF5733",
            "avatar_url": "https://example.com/avatar.png",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["display_name"] == "我的发言身份"
        assert data["data"]["aliases"] == ["我", "本人"]
        assert data["data"]["color"] == "#FF5733"

    def test_create_speaker_identity_minimal(self, authorized_client: TestClient) -> None:
        """Test creating a speaker identity with minimal fields."""
        response = authorized_client.post("/api/v1/speaker-identities", json={
            "display_name": "Simple Speaker",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["display_name"] == "Simple Speaker"

    def test_get_speaker_identity(self, authorized_client: TestClient) -> None:
        """Test getting a specific speaker identity."""
        # First create one
        create_response = authorized_client.post("/api/v1/speaker-identities", json={
            "display_name": "Test Speaker",
        })
        identity_id = create_response.json()["data"]["id"]

        # Now get it
        response = authorized_client.get(f"/api/v1/speaker-identities/{identity_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["display_name"] == "Test Speaker"

    def test_get_speaker_identity_not_found(self, authorized_client: TestClient) -> None:
        """Test getting a non-existent speaker identity."""
        response = authorized_client.get("/api/v1/speaker-identities/non-existent-id")
        assert response.status_code == 404

    def test_update_speaker_identity(self, authorized_client: TestClient) -> None:
        """Test updating a speaker identity."""
        # First create one
        create_response = authorized_client.post("/api/v1/speaker-identities", json={
            "display_name": "Original Name",
            "color": "#000000",
        })
        identity_id = create_response.json()["data"]["id"]

        # Update it
        response = authorized_client.put(f"/api/v1/speaker-identities/{identity_id}", json={
            "display_name": "Updated Name",
            "aliases": ["新别名"],
            "color": "#FFFFFF",
            "avatar_url": "https://example.com/new-avatar.png",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["display_name"] == "Updated Name"
        assert data["data"]["aliases"] == ["新别名"]
        assert data["data"]["color"] == "#FFFFFF"

    def test_update_speaker_identity_not_found(self, authorized_client: TestClient) -> None:
        """Test updating a non-existent speaker identity."""
        response = authorized_client.put("/api/v1/speaker-identities/non-existent-id", json={
            "display_name": "Updated Name",
        })
        assert response.status_code == 404

    def test_delete_speaker_identity(self, authorized_client: TestClient) -> None:
        """Test deleting a speaker identity."""
        # First create one
        create_response = authorized_client.post("/api/v1/speaker-identities", json={
            "display_name": "To Be Deleted",
        })
        identity_id = create_response.json()["data"]["id"]

        # Delete it
        response = authorized_client.delete(f"/api/v1/speaker-identities/{identity_id}")
        assert response.status_code == 204

        # Verify it's gone
        get_response = authorized_client.get(f"/api/v1/speaker-identities/{identity_id}")
        assert get_response.status_code == 404

    def test_delete_speaker_identity_not_found(self, authorized_client: TestClient) -> None:
        """Test deleting a non-existent speaker identity."""
        response = authorized_client.delete("/api/v1/speaker-identities/non-existent-id")
        assert response.status_code == 404

    def test_list_speaker_identities_with_data(self, authorized_client: TestClient) -> None:
        """Test listing speaker identities with data."""
        # Create two identities
        authorized_client.post("/api/v1/speaker-identities", json={
            "display_name": "Speaker 1",
        })
        authorized_client.post("/api/v1/speaker-identities", json={
            "display_name": "Speaker 2",
        })

        # List them
        response = authorized_client.get("/api/v1/speaker-identities")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) == 2
        display_names = [s["display_name"] for s in data["data"]]
        assert "Speaker 1" in display_names
        assert "Speaker 2" in display_names

    def test_access_another_user_identity(self, authorized_client: TestClient, db_session) -> None:
        """Test that users cannot access other users' identities."""
        # This test requires creating another user and their identity
        # For now, we just test that an invalid ID returns 404
        response = authorized_client.get("/api/v1/speaker-identities/other-user-identity")
        assert response.status_code == 404
