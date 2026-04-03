"""Tests for meetings API."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import Meeting, User


def test_list_meetings(authorized_client: TestClient, sample_meeting: Meeting) -> None:
    resp = authorized_client.get("/api/v1/meetings")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert any(m["id"] == sample_meeting.id for m in data["items"])


def test_search_meetings(authorized_client: TestClient, sample_meeting: Meeting) -> None:
    resp = authorized_client.get("/api/v1/meetings?q=产品")
    assert resp.status_code == 200
    data = resp.json()
    assert any(m["id"] == sample_meeting.id for m in data["items"])


def test_get_meeting_detail(authorized_client: TestClient, sample_meeting: Meeting) -> None:
    resp = authorized_client.get(f"/api/v1/meetings/{sample_meeting.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "产品策略会"


def test_delete_meeting(authorized_client: TestClient, sample_meeting: Meeting) -> None:
    resp = authorized_client.delete(f"/api/v1/meetings/{sample_meeting.id}")
    assert resp.status_code == 204

    resp = authorized_client.get(f"/api/v1/meetings/{sample_meeting.id}")
    assert resp.status_code == 404


def test_get_meeting_not_found(authorized_client: TestClient) -> None:
    resp = authorized_client.get("/api/v1/meetings/nonexistent-id")
    assert resp.status_code == 404


def test_delete_meeting_not_found(authorized_client: TestClient) -> None:
    resp = authorized_client.delete("/api/v1/meetings/nonexistent-id")
    assert resp.status_code == 404


def test_search_meetings_no_results(authorized_client: TestClient) -> None:
    resp = authorized_client.get("/api/v1/meetings?q=xyznonexistent")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0


def test_list_meetings_pagination(authorized_client: TestClient, sample_meeting: Meeting) -> None:
    resp = authorized_client.get("/api/v1/meetings?page=1&size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data


def test_list_meetings_pagination_page2(authorized_client: TestClient, sample_meeting: Meeting) -> None:
    """Test pagination with page=2 and smaller size."""
    resp = authorized_client.get("/api/v1/meetings?page=2&size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data
    # With only one meeting, page 2 should be empty
    assert len(data["items"]) == 0


@pytest.mark.asyncio
async def test_access_another_user_meeting(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User
) -> None:
    """Test accessing another user's meeting should return 404."""
    from speaksum.models.models import Meeting

    # Create another user
    other_user = User(id="other-user-789", email="other2@example.com", password_hash="hashed")
    db_session.add(other_user)
    await db_session.commit()

    # Create meeting for other user
    other_meeting = Meeting(
        user_id=other_user.id,
        title="Other User Meeting",
        source_file="other.txt",
        status="completed"
    )
    db_session.add(other_meeting)
    await db_session.commit()
    await db_session.refresh(other_meeting)

    # Try to get other user's meeting
    resp = authorized_client.get(f"/api/v1/meetings/{other_meeting.id}")
    assert resp.status_code == 404

    # Try to delete other user's meeting
    resp = authorized_client.delete(f"/api/v1/meetings/{other_meeting.id}")
    assert resp.status_code == 404
