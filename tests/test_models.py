"""Tests for database models."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import speaksum.models.models as app_models
from speaksum.models.models import GraphLayout, Meeting, SpeakerIdentity, Speech, Topic, User, UserModelConfig


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


@pytest.mark.asyncio
async def test_meeting_new_fields(db_session: AsyncSession, test_user: User) -> None:
    """Test Meeting model with new duration_minutes and participants fields."""
    meeting = Meeting(
        user_id=test_user.id,
        title="Test Meeting",
        source_file="test.txt",
        duration_minutes=60,
        participants=["张三", "李四"],
    )
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)

    assert meeting.duration_minutes == 60
    assert meeting.participants == ["张三", "李四"]


@pytest.mark.asyncio
async def test_speech_new_fields(db_session: AsyncSession, test_user: User) -> None:
    """Test Speech model with new sequence_number and is_target_speaker fields."""
    meeting = Meeting(user_id=test_user.id, title="M", source_file="m.txt")
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)

    speech = Speech(
        meeting_id=meeting.id,
        sequence_number=1,
        speaker="我",
        is_target_speaker=True,
        raw_text="hello",
    )
    db_session.add(speech)
    await db_session.commit()
    await db_session.refresh(speech)

    assert speech.sequence_number == 1
    assert speech.is_target_speaker is True


@pytest.mark.asyncio
async def test_speaker_identity_model(db_session: AsyncSession, test_user: User) -> None:
    """Test SpeakerIdentity model."""
    speaker = SpeakerIdentity(
        user_id=test_user.id,
        display_name="我的发言身份",
        aliases=["我", "本人"],
        color="#FF5733",
        avatar_url="https://example.com/avatar.png",
    )
    db_session.add(speaker)
    await db_session.commit()

    result = await db_session.execute(
        select(SpeakerIdentity).where(SpeakerIdentity.user_id == test_user.id)
    )
    fetched = result.scalar_one()
    assert fetched.display_name == "我的发言身份"
    assert fetched.aliases == ["我", "本人"]
    assert fetched.color == "#FF5733"
    assert fetched.avatar_url == "https://example.com/avatar.png"


@pytest.mark.asyncio
async def test_user_model_config_encryption_version(db_session: AsyncSession, test_user: User) -> None:
    """Test UserModelConfig with encryption_version field."""
    config = UserModelConfig(
        user_id=test_user.id,
        provider="kimi",
        name="Kimi Config",
        default_model="kimi-latest",
        api_key_encrypted="encrypted_value",
        encryption_version=1,
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)

    assert config.encryption_version == 1


@pytest.mark.asyncio
async def test_user_relationships(db_session: AsyncSession, test_user: User) -> None:
    """Test User relationships including speaker_identities."""
    from sqlalchemy.orm import selectinload

    # Create speaker identity
    speaker = SpeakerIdentity(
        user_id=test_user.id,
        display_name="Test Speaker",
    )
    db_session.add(speaker)
    await db_session.commit()

    # Fetch user with eager loaded relationships
    result = await db_session.execute(
        select(User).where(User.id == test_user.id).options(selectinload(User.speaker_identities))
    )
    fetched = result.scalar_one()

    assert len(fetched.speaker_identities) == 1
    assert fetched.speaker_identities[0].display_name == "Test Speaker"


@pytest.mark.asyncio
async def test_graph_layout_model(db_session: AsyncSession, test_user: User) -> None:
    """Test GraphLayout model."""
    layout = GraphLayout(
        user_id=test_user.id,
        layout_data={"nodes": [{"id": "1", "x": 100, "y": 200}]},
        version=1,
    )
    db_session.add(layout)
    await db_session.commit()

    result = await db_session.execute(select(GraphLayout).where(GraphLayout.user_id == test_user.id))
    fetched = result.scalar_one()
    assert fetched.layout_data["nodes"][0]["x"] == 100
    assert fetched.version == 1


@pytest.mark.asyncio
async def test_meeting_error_message(db_session: AsyncSession, test_user: User) -> None:
    """Test Meeting error_message field."""
    meeting = Meeting(
        user_id=test_user.id,
        title="Test Meeting",
        source_file="test.txt",
        status="failed",
        error_message="Processing failed: LLM API timeout",
    )
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)

    assert meeting.status == "failed"
    assert meeting.error_message == "Processing failed: LLM API timeout"


@pytest.mark.asyncio
async def test_meeting_supports_viewpoint_fields(db_session: AsyncSession, test_user: User) -> None:
    meeting = Meeting(
        user_id=test_user.id,
        title="观点会议",
        source_file="viewpoints.txt",
        status="ignored",
        context_summary="这是一场关于数字化转型优先级的讨论。",
        key_quotes=["先明确目标，再投入资源。"],
        ignored_reason="未检测到该发言人，因此未生成记录",
    )
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)

    assert meeting.status == "ignored"
    assert meeting.context_summary == "这是一场关于数字化转型优先级的讨论。"
    assert meeting.key_quotes == ["先明确目标，再投入资源。"]
    assert meeting.ignored_reason == "未检测到该发言人，因此未生成记录"


@pytest.mark.asyncio
async def test_viewpoint_model_belongs_to_meeting(db_session: AsyncSession, test_user: User) -> None:
    viewpoint_cls = getattr(app_models, "Viewpoint", None)
    assert viewpoint_cls is not None

    meeting = Meeting(user_id=test_user.id, title="观点会议", source_file="viewpoints.txt")
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)

    viewpoint = viewpoint_cls(
        meeting_id=meeting.id,
        user_id=test_user.id,
        sequence_number=1,
        content="在预算受限时应优先推进高收益数字化项目。",
        topics=["数字化", "预算"],
        confidence="high",
    )
    db_session.add(viewpoint)
    await db_session.commit()

    result = await db_session.execute(
        select(viewpoint_cls).where(viewpoint_cls.meeting_id == meeting.id)
    )
    fetched = result.scalar_one()
    assert fetched.content == "在预算受限时应优先推进高收益数字化项目。"
    assert fetched.topics == ["数字化", "预算"]
