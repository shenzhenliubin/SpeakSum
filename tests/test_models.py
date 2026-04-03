"""Tests for database models."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import Meeting, Speech, Topic, User


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession) -> None:
    user = User(email="m@example.com", password_hash="x")
    db_session.add(user)
    await db_session.commit()

    result = await db_session.execute(select(User).where(User.email == "m@example.com"))
    fetched = result.scalar_one()
    assert fetched.email == "m@example.com"


@pytest.mark.asyncio
async def test_meeting_relationship(db_session: AsyncSession, test_user: User) -> None:
    meeting = Meeting(user_id=test_user.id, title="Test Meeting", source_file="test.txt")
    db_session.add(meeting)
    await db_session.commit()

    result = await db_session.execute(select(Meeting).where(Meeting.user_id == test_user.id))
    fetched = result.scalar_one()
    assert fetched.title == "Test Meeting"


@pytest.mark.asyncio
async def test_speech_cascade_delete(db_session: AsyncSession, test_user: User) -> None:
    meeting = Meeting(user_id=test_user.id, title="M", source_file="m.txt")
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)

    speech = Speech(meeting_id=meeting.id, speaker="我", raw_text="hello")
    db_session.add(speech)
    await db_session.commit()

    await db_session.delete(meeting)
    await db_session.commit()

    result = await db_session.execute(select(Speech).where(Speech.meeting_id == meeting.id))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_topic_embedding_fallback(db_session: AsyncSession, test_user: User) -> None:
    topic = Topic(user_id=test_user.id, name="产品策略", embedding=[0.1] * 1536)
    db_session.add(topic)
    await db_session.commit()

    result = await db_session.execute(select(Topic).where(Topic.name == "产品策略"))
    fetched = result.scalar_one()
    assert fetched.embedding is not None
    assert len(fetched.embedding) == 1536
