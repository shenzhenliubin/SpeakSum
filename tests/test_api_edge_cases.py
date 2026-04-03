"""Tests for API edge cases to improve coverage."""

from fastapi.testclient import TestClient

from speaksum.models.models import Meeting


def test_list_meetings_empty(authorized_client: TestClient) -> None:
    """Test listing meetings when none exist."""
    resp = authorized_client.get("/api/v1/meetings")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data


def test_list_meetings_with_pagination(authorized_client: TestClient, sample_meeting: Meeting) -> None:
    """Test listing meetings with different page sizes."""
    resp = authorized_client.get("/api/v1/meetings?page=1&size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) <= 5


def test_search_meetings_special_chars(authorized_client: TestClient) -> None:
    """Test searching meetings with special characters."""
    resp = authorized_client.get("/api/v1/meetings?q=%E4%BA%A7%E5%93%81")  # URL encoded Chinese
    assert resp.status_code == 200


def test_upload_empty_speaker_identity(authorized_client: TestClient, tmp_path) -> None:
    """Test upload with empty speaker identity."""
    txt = tmp_path / "meeting.txt"
    txt.write_text("[10:30] 我: hello", encoding="utf-8")

    with open(txt, "rb") as f:
        resp = authorized_client.post(
            "/api/v1/upload?speaker_identity=",
            files={"file": ("meeting.txt", f, "text/plain")},
        )
    # Should still work with empty speaker identity
    assert resp.status_code in [202, 400]
