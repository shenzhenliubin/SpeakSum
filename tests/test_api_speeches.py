"""Tests for speeches API."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import Meeting, Speech, User


@pytest.fixture
async def sample_meeting_with_speeches(db_session: AsyncSession, test_user: User) -> Meeting:
    meeting = Meeting(user_id=test_user.id, title="Test Meeting", source_file="m.txt", status="completed")
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)

    speech1 = Speech(meeting_id=meeting.id, speaker="我", raw_text="hello", timestamp="10:30")
    speech2 = Speech(meeting_id=meeting.id, speaker="我", raw_text="world", timestamp="10:31")
    db_session.add(speech1)
    db_session.add(speech2)
    await db_session.commit()
    await db_session.refresh(speech1)
    await db_session.refresh(speech2)

    # Store speech IDs for later use
    meeting._speech_ids = [speech1.id, speech2.id]
    return meeting


def test_list_speeches(authorized_client: TestClient, sample_meeting_with_speeches: Meeting) -> None:
    meeting_id = sample_meeting_with_speeches.id
    resp = authorized_client.get(f"/api/v1/meetings/{meeting_id}/speeches")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_get_speech(authorized_client: TestClient, sample_meeting_with_speeches: Meeting) -> None:
    speech_id = sample_meeting_with_speeches._speech_ids[0]
    resp = authorized_client.get(f"/api/v1/speeches/{speech_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["raw_text"] == "hello"


def test_update_speech(authorized_client: TestClient, sample_meeting_with_speeches: Meeting) -> None:
    speech_id = sample_meeting_with_speeches._speech_ids[0]
    resp = authorized_client.patch(
        f"/api/v1/speeches/{speech_id}",
        json={"cleaned_text": "updated", "sentiment": "positive"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["cleaned_text"] == "updated"
    assert data["sentiment"] == "positive"


def test_update_speech_invalid_sentiment(authorized_client: TestClient, sample_meeting_with_speeches: Meeting) -> None:
    speech_id = sample_meeting_with_speeches._speech_ids[0]
    resp = authorized_client.patch(
        f"/api/v1/speeches/{speech_id}",
        json={"sentiment": "invalid"}
    )
    assert resp.status_code == 422


def test_list_speeches_meeting_not_found(authorized_client: TestClient) -> None:
    resp = authorized_client.get("/api/v1/meetings/nonexistent-id/speeches")
    assert resp.status_code == 404


def test_get_speech_not_found(authorized_client: TestClient) -> None:
    resp = authorized_client.get("/api/v1/speeches/nonexistent-id")
    assert resp.status_code == 404


def test_update_speech_not_found(authorized_client: TestClient) -> None:
    resp = authorized_client.patch(
        "/api/v1/speeches/nonexistent-id",
        json={"cleaned_text": "updated"}
    )
    assert resp.status_code == 404


def test_update_speech_partial(authorized_client: TestClient, sample_meeting_with_speeches: Meeting) -> None:
    """Test updating speech with only some fields."""
    speech_id = sample_meeting_with_speeches._speech_ids[0]

    # Update only cleaned_text
    resp = authorized_client.patch(
        f"/api/v1/speeches/{speech_id}",
        json={"cleaned_text": "only cleaned"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["cleaned_text"] == "only cleaned"

    # Update only key_quotes
    resp = authorized_client.patch(
        f"/api/v1/speeches/{speech_id}",
        json={"key_quotes": ["quote1", "quote2"]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["key_quotes"] == ["quote1", "quote2"]

    # Update only topics
    resp = authorized_client.patch(
        f"/api/v1/speeches/{speech_id}",
        json={"topics": ["topic1", "topic2"]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["topics"] == ["topic1", "topic2"]


@pytest.mark.asyncio
async def test_access_another_user_speech(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User
) -> None:
    """Test accessing another user's speech should return 404."""
    # Create another user
    other_user = User(id="other-user-456", email="other@example.com", password_hash="hashed")
    db_session.add(other_user)
    await db_session.commit()

    # Create meeting and speech for other user
    other_meeting = Meeting(
        user_id=other_user.id,
        title="Other Meeting",
        source_file="other.txt",
        status="completed"
    )
    db_session.add(other_meeting)
    await db_session.commit()
    await db_session.refresh(other_meeting)

    other_speech = Speech(
        meeting_id=other_meeting.id,
        speaker="我",
        raw_text="other user's speech",
        timestamp="10:30"
    )
    db_session.add(other_speech)
    await db_session.commit()
    await db_session.refresh(other_speech)

    # Try to access other user's speech
    resp = authorized_client.get(f"/api/v1/speeches/{other_speech.id}")
    assert resp.status_code == 404

    # Try to update other user's speech
    resp = authorized_client.patch(
        f"/api/v1/speeches/{other_speech.id}",
        json={"cleaned_text": "hacked"}
    )
    assert resp.status_code == 404
