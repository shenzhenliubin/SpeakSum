"""Tests for Celery content processing behavior and error classification."""

from datetime import date

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from speaksum.core.exceptions import SpeakSumException
from speaksum.models.models import Content, Quote, QuoteDomain, User, UserModelConfig
from speaksum.tasks.celery_tasks import (
    PROCESSING_QUEUE_WAIT_MESSAGE,
    _process_content_async,
    _should_retry_processing_error,
)


class FakeTask:
    def __init__(self, session_maker: async_sessionmaker[AsyncSession]) -> None:
        self._session_maker = session_maker
        self.updates: list[tuple[str, dict]] = []

    @property
    def async_session(self) -> async_sessionmaker[AsyncSession]:
        return self._session_maker

    def update_state(self, state: str, meta: dict) -> None:
        self.updates.append((state, meta))

    def retry(self, exc: Exception) -> None:
        raise RuntimeError(f"unexpected retry: {exc}")


class FakeRetryTask(FakeTask):
    def __init__(self, session_maker: async_sessionmaker[AsyncSession]) -> None:
        super().__init__(session_maker)
        self.retry_calls: list[dict[str, object]] = []

    def retry(self, exc: Exception, countdown: int | None = None) -> None:  # type: ignore[override]
        self.retry_calls.append({"exc": exc, "countdown": countdown})
        raise RuntimeError(f"queued retry: {exc}")


def test_should_not_retry_client_speaksum_errors() -> None:
    assert _should_retry_processing_error(SpeakSumException("bad config", status_code=400)) is False


def test_should_retry_server_speaksum_errors() -> None:
    assert _should_retry_processing_error(SpeakSumException("temporary", status_code=500)) is True


def test_should_not_retry_http_client_errors() -> None:
    request = httpx.Request("POST", "https://api.moonshot.cn/v1/chat/completions")
    response = httpx.Response(401, request=request)
    exc = httpx.HTTPStatusError("unauthorized", request=request, response=response)

    assert _should_retry_processing_error(exc) is False


def test_should_retry_http_server_errors() -> None:
    request = httpx.Request("POST", "https://api.moonshot.cn/v1/chat/completions")
    response = httpx.Response(503, request=request)
    exc = httpx.HTTPStatusError("unavailable", request=request, response=response)

    assert _should_retry_processing_error(exc) is True


@pytest.mark.asyncio
async def test_process_content_async_persists_summary_quotes_and_domains(
    db_session: AsyncSession,
    async_engine,
    test_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="专题会",
        source_type="meeting_minutes",
        source_file_name="meeting.txt",
        source_file_path="meeting.txt",
        status="pending",
    )
    db_session.add(content)
    db_session.add(
        UserModelConfig(
            user_id=test_user.id,
            provider="siliconflow",
            name="SiliconFlow",
            default_model="deepseek-ai/DeepSeek-V3",
            api_key_encrypted="encrypted",
        )
    )
    await db_session.commit()
    await db_session.refresh(content)

    session_maker = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    task = FakeTask(session_maker)

    class DummyProcessor:
        def __init__(self, llm) -> None:
            self.llm = llm

        async def process(self, source_type, text, owner_identity="刘彬", aliases=None, evidence=None):
            assert source_type == "meeting_minutes"
            assert owner_identity == "刘彬"
            return {
                "status": "completed",
                "ignored_reason": None,
                "summary": "刘彬在会议中强调，先明确平台边界，再决定资源投入节奏。",
                "quotes": [
                    {
                        "text": "先明确平台边界，再决定资源投入节奏。",
                        "domain_ids": ["decision_method", "technology_architecture"],
                    },
                    {
                        "text": "试点范围应先收敛，再逐步放大。",
                        "domain_ids": ["delivery_execution"],
                    },
                ],
            }

    class DummyBuilder:
        def __init__(self, db) -> None:
            self.db = db

        async def refresh_graph_for_user(self, user_id):
            return {"nodes": [], "edges": []}

    monkeypatch.setattr("speaksum.tasks.celery_tasks.parse_file", lambda file_path: "会议全文")
    monkeypatch.setattr(
        "speaksum.tasks.celery_tasks.extract_meeting_date",
        lambda text, source_name=None: date(2026, 4, 6),
    )
    monkeypatch.setattr("speaksum.tasks.celery_tasks.get_llm_client", lambda **kwargs: object())
    monkeypatch.setattr("speaksum.tasks.celery_tasks.ContentProcessor", DummyProcessor)
    monkeypatch.setattr("speaksum.tasks.celery_tasks.DomainGraphBuilder", DummyBuilder)

    result = await _process_content_async(task, content.id, "meeting.txt", "meeting_minutes", "siliconflow")

    assert result == {
        "content_id": content.id,
        "status": "completed",
        "stage": "completed",
        "percent": 100,
        "message": "处理完成",
    }

    async with session_maker() as verify_session:
        refreshed_content = await verify_session.get(Content, content.id)
        assert refreshed_content is not None
        assert refreshed_content.status == "completed"
        assert refreshed_content.content_date == date(2026, 4, 6)
        assert refreshed_content.summary_text == "刘彬在会议中强调，先明确平台边界，再决定资源投入节奏。"
        assert refreshed_content.completed_at is not None

        quotes = (
            await verify_session.execute(
                select(Quote).where(Quote.content_id == content.id).order_by(Quote.sequence_number)
            )
        ).scalars().all()
        assert [quote.text for quote in quotes] == [
            "先明确平台边界，再决定资源投入节奏。",
            "试点范围应先收敛，再逐步放大。",
        ]

        quote_domains = (
            await verify_session.execute(
                select(QuoteDomain.quote_id, QuoteDomain.domain_id).order_by(QuoteDomain.quote_id, QuoteDomain.domain_id)
            )
        ).all()
        assert sorted(quote_domains) == sorted(
            [
                (quotes[0].id, "decision_method"),
                (quotes[0].id, "technology_architecture"),
                (quotes[1].id, "delivery_execution"),
            ]
        )

    stages = [meta["stage"] for _, meta in task.updates]
    assert "parsing" in stages
    assert "identifying_speaker" in stages
    assert "summarizing" in stages
    assert "extracting_quotes" in stages
    assert "building_graph" in stages


@pytest.mark.asyncio
async def test_process_content_async_marks_ignored_for_meeting_minutes_without_speech(
    db_session: AsyncSession,
    async_engine,
    test_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="专题会",
        source_type="meeting_minutes",
        source_file_name="meeting.txt",
        source_file_path="meeting.txt",
        status="pending",
    )
    db_session.add(content)
    await db_session.commit()
    await db_session.refresh(content)

    session_maker = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    task = FakeTask(session_maker)

    class DummyProcessor:
        def __init__(self, llm) -> None:
            self.llm = llm

        async def process(self, source_type, text, owner_identity="刘彬", aliases=None, evidence=None):
            return {
                "status": "ignored",
                "ignored_reason": "未检测到刘彬发言，因此未生成记录",
                "summary": "",
                "quotes": [],
            }

    class DummyBuilder:
        def __init__(self, db) -> None:
            self.db = db

        async def refresh_graph_for_user(self, user_id):
            raise AssertionError("ignored content should not rebuild graph")

    monkeypatch.setattr("speaksum.tasks.celery_tasks.parse_file", lambda file_path: "会议全文")
    monkeypatch.setattr("speaksum.tasks.celery_tasks.extract_meeting_date", lambda text, source_name=None: None)
    monkeypatch.setattr("speaksum.tasks.celery_tasks.get_llm_client", lambda **kwargs: object())
    monkeypatch.setattr("speaksum.tasks.celery_tasks.ContentProcessor", DummyProcessor)
    monkeypatch.setattr("speaksum.tasks.celery_tasks.DomainGraphBuilder", DummyBuilder)

    result = await _process_content_async(task, content.id, "meeting.txt", "meeting_minutes", "siliconflow")

    assert result == {
        "content_id": content.id,
        "status": "ignored",
        "stage": "ignored",
        "percent": 100,
        "message": "未检测到刘彬发言，因此未生成记录",
        "error": "未检测到刘彬发言，因此未生成记录",
    }

    async with session_maker() as verify_session:
        refreshed_content = await verify_session.get(Content, content.id)
        assert refreshed_content is not None
        assert refreshed_content.status == "ignored"
        assert refreshed_content.ignored_reason == "未检测到刘彬发言，因此未生成记录"
        quotes = (await verify_session.execute(select(Quote).where(Quote.content_id == content.id))).scalars().all()
        assert quotes == []


@pytest.mark.asyncio
async def test_process_content_async_other_text_skips_identifying_speaker_stage(
    db_session: AsyncSession,
    async_engine,
    test_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="技术随笔",
        source_type="other_text",
        source_file_name="note.txt",
        source_file_path="note.txt",
        status="pending",
    )
    db_session.add(content)
    await db_session.commit()
    await db_session.refresh(content)

    session_maker = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    task = FakeTask(session_maker)

    class DummyProcessor:
        def __init__(self, llm) -> None:
            self.llm = llm

        async def process(self, source_type, text, owner_identity="刘彬", aliases=None, evidence=None):
            assert source_type == "other_text"
            return {
                "status": "completed",
                "ignored_reason": None,
                "summary": "刘彬在文本中强调，技术判断必须服务于长期业务边界。",
                "quotes": [
                    {
                        "text": "技术判断必须服务于长期业务边界。",
                        "domain_ids": ["technology_architecture", "product_business"],
                    }
                ],
            }

    class DummyBuilder:
        def __init__(self, db) -> None:
            self.db = db

        async def refresh_graph_for_user(self, user_id):
            return {"nodes": [], "edges": []}

    def _unexpected_scan(*args, **kwargs):
        raise AssertionError("scan_speaker_evidence should not run for other_text")

    monkeypatch.setattr("speaksum.tasks.celery_tasks.parse_file", lambda file_path: "这是一段刘彬的随笔。")
    monkeypatch.setattr("speaksum.tasks.celery_tasks.extract_meeting_date", lambda text, source_name=None: date(2026, 4, 5))
    monkeypatch.setattr("speaksum.tasks.celery_tasks.scan_speaker_evidence", _unexpected_scan)
    monkeypatch.setattr("speaksum.tasks.celery_tasks.get_llm_client", lambda **kwargs: object())
    monkeypatch.setattr("speaksum.tasks.celery_tasks.ContentProcessor", DummyProcessor)
    monkeypatch.setattr("speaksum.tasks.celery_tasks.DomainGraphBuilder", DummyBuilder)

    await _process_content_async(task, content.id, "note.txt", "other_text", "siliconflow")

    stages = [meta["stage"] for _, meta in task.updates]
    assert "identifying_speaker" not in stages
    assert "summarizing" in stages


@pytest.mark.asyncio
async def test_process_content_async_marks_failed_on_non_retryable_provider_error(
    db_session: AsyncSession,
    async_engine,
    test_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="专题会",
        source_type="meeting_minutes",
        source_file_name="meeting.txt",
        source_file_path="meeting.txt",
        status="pending",
    )
    db_session.add(content)
    await db_session.commit()
    await db_session.refresh(content)

    session_maker = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    task = FakeTask(session_maker)

    class DummyProcessor:
        def __init__(self, llm) -> None:
            self.llm = llm

        async def process(self, source_type, text, owner_identity="刘彬", aliases=None, evidence=None):
            raise SpeakSumException("provider rejected request", status_code=400)

    monkeypatch.setattr("speaksum.tasks.celery_tasks.parse_file", lambda file_path: "会议全文")
    monkeypatch.setattr("speaksum.tasks.celery_tasks.extract_meeting_date", lambda text, source_name=None: None)
    monkeypatch.setattr("speaksum.tasks.celery_tasks.get_llm_client", lambda **kwargs: object())
    monkeypatch.setattr("speaksum.tasks.celery_tasks.ContentProcessor", DummyProcessor)

    with pytest.raises(SpeakSumException, match="provider rejected request"):
        await _process_content_async(task, content.id, "meeting.txt", "meeting_minutes", "siliconflow")

    async with session_maker() as verify_session:
        refreshed_content = await verify_session.get(Content, content.id)
        assert refreshed_content is not None
        assert refreshed_content.status == "failed"
        assert "provider rejected request" in (refreshed_content.error_message or "")


@pytest.mark.asyncio
async def test_process_content_async_retries_when_user_processing_lock_is_busy(
    db_session: AsyncSession,
    async_engine,
    test_user: User,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="专题会",
        source_type="meeting_minutes",
        source_file_name="meeting.txt",
        source_file_path="meeting.txt",
        status="pending",
    )
    db_session.add(content)
    await db_session.commit()
    await db_session.refresh(content)

    session_maker = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    task = FakeRetryTask(session_maker)

    async def _busy_lock(user_id: str) -> None:
        return None

    monkeypatch.setattr("speaksum.tasks.celery_tasks._acquire_processing_lock", _busy_lock)
    monkeypatch.setattr(
        "speaksum.tasks.celery_tasks.parse_file",
        lambda file_path: (_ for _ in ()).throw(AssertionError("parse_file should not run while queued")),
    )

    with pytest.raises(RuntimeError, match="queued retry"):
        await _process_content_async(task, content.id, "meeting.txt", "meeting_minutes", "siliconflow")

    assert task.retry_calls
    assert task.retry_calls[0]["countdown"] == 5
    assert str(task.retry_calls[0]["exc"]) == PROCESSING_QUEUE_WAIT_MESSAGE

    async with session_maker() as verify_session:
        refreshed_content = await verify_session.get(Content, content.id)
        assert refreshed_content is not None
        assert refreshed_content.status == "pending"
        assert refreshed_content.error_message is None

    assert task.updates[-1][0] == "PENDING"
    assert task.updates[-1][1]["stage"] == "queued"
    assert task.updates[-1][1]["message"] == PROCESSING_QUEUE_WAIT_MESSAGE
