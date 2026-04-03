"""pytest fixtures."""

import asyncio
from collections.abc import AsyncGenerator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from speaksum.core.database import get_db
from speaksum.core.security import create_access_token
from speaksum.main import app
from speaksum.models.models import Base, Meeting, Speech, User

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def async_engine():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest.fixture
def test_token() -> str:
    return create_access_token({"sub": "test-user-123", "email": "test@example.com"})


@pytest.fixture
def authorized_client(test_token, async_engine) -> TestClient:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async_session = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    client.headers["Authorization"] = f"Bearer {test_token}"
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = User(id="test-user-123", email="test@example.com", password_hash="hashed")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def sample_meeting(db_session: AsyncSession, test_user: User) -> Meeting:
    meeting = Meeting(user_id=test_user.id, title="产品策略会", source_file="m.txt", status="completed")
    db_session.add(meeting)
    await db_session.commit()
    await db_session.refresh(meeting)
    speech = Speech(meeting_id=meeting.id, speaker="我", raw_text="hello", timestamp="10:30")
    db_session.add(speech)
    await db_session.commit()
    return meeting


@pytest.fixture
def mock_celery_task():
    mock = MagicMock()
    mock.id = "task-123"
    with patch("speaksum.api.upload.celery_app.send_task", return_value=mock):
        yield mock
