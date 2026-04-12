"""Celery tasks for async meeting processing."""

import asyncio
import logging
import uuid
from typing import Any

from celery import Task
import httpx
from redis.asyncio import from_url as redis_from_url
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from speaksum.core.config import settings
from speaksum.core.exceptions import SpeakSumException
from speaksum.models.models import Content, Quote, QuoteDomain, SpeakerIdentity, UserModelConfig, now_utc
from speaksum.services.content_processor import ContentProcessor
from speaksum.services.domain_graph_builder import DomainGraphBuilder, ensure_default_domains
from speaksum.services.file_parser import extract_meeting_date, parse_file
from speaksum.services.llm_client import get_llm_client
from speaksum.services.speaker_evidence import scan_speaker_evidence
from speaksum.tasks.celery_app import app

logger = logging.getLogger(__name__)
PROCESSING_LOCK_TTL_SECONDS = 60 * 60
PROCESSING_LOCK_RETRY_DELAY_SECONDS = 5
PROCESSING_QUEUE_WAIT_MESSAGE = "前序文件处理中，当前文件排队等待中。"
PROCESSING_LOCK_PREFIX = "speaksum:content-processing-lock"


def _processing_lock_key(user_id: str) -> str:
    return f"{PROCESSING_LOCK_PREFIX}:{user_id}"


async def _acquire_processing_lock(user_id: str) -> str | None:
    token = uuid.uuid4().hex
    redis = redis_from_url(settings.REDIS_URL, decode_responses=True)
    try:
        acquired = await redis.set(
            _processing_lock_key(user_id),
            token,
            ex=PROCESSING_LOCK_TTL_SECONDS,
            nx=True,
        )
        return token if acquired else None
    finally:
        await redis.aclose()


async def _release_processing_lock(user_id: str, token: str) -> None:
    redis = redis_from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await redis.eval(
            """
            if redis.call('get', KEYS[1]) == ARGV[1] then
              return redis.call('del', KEYS[1])
            end
            return 0
            """,
            1,
            _processing_lock_key(user_id),
            token,
        )
    finally:
        await redis.aclose()


def _should_retry_processing_error(exc: Exception) -> bool:
    if isinstance(exc, SpeakSumException):
        return exc.status_code >= 500
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        return status_code >= 500 or status_code == 429
    return True


class SqlAlchemyTask(Task):  # type: ignore[misc]
    """Celery Task with async DB session support."""

    _async_session_maker: async_sessionmaker[AsyncSession] | None = None

    @property
    def async_session(self) -> async_sessionmaker[AsyncSession]:
        if self._async_session_maker is None:
            engine = create_async_engine(settings.DATABASE_URL, future=True)
            self._async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        return self._async_session_maker


@app.task(bind=True, base=SqlAlchemyTask, max_retries=3)  # type: ignore[untyped-decorator]
def process_content_task(
    self: SqlAlchemyTask,
    content_id: str,
    file_path: str,
    source_type: str,
    model_config: str = "kimi",
) -> dict[str, Any]:
    return asyncio.run(_process_content_async(self, content_id, file_path, source_type, model_config))


async def _replace_content_quotes(
    db: AsyncSession,
    content: Content,
    quotes_payload: list[dict[str, Any]],
) -> None:
    existing_quote_ids = (
        await db.execute(select(Quote.id).where(Quote.content_id == content.id))
    ).scalars().all()
    if existing_quote_ids:
        await db.execute(delete(QuoteDomain).where(QuoteDomain.quote_id.in_(existing_quote_ids)))
        await db.execute(delete(Quote).where(Quote.id.in_(existing_quote_ids)))
        await db.flush()

    created_quotes: list[Quote] = []
    for index, payload in enumerate(quotes_payload, start=1):
        text = str(payload.get("text") or "").strip()
        if not text:
            continue
        quote = Quote(
            content_id=content.id,
            user_id=content.user_id,
            sequence_number=index,
            text=text,
        )
        db.add(quote)
        created_quotes.append(quote)

    await db.flush()

    for quote, payload in zip(created_quotes, quotes_payload, strict=False):
        for domain_id in payload.get("domain_ids") or []:
            db.add(QuoteDomain(quote_id=quote.id, domain_id=domain_id))


async def _process_content_async(
    self: SqlAlchemyTask,
    content_id: str,
    file_path: str,
    source_type: str,
    model_config: str = "kimi",
) -> dict[str, Any]:
    async with self.async_session() as db:
        lock_token: str | None = None
        content_result = await db.execute(select(Content).where(Content.id == content_id))
        content = content_result.scalar_one_or_none()
        if not content:
            logger.error("Content %s not found in database at task start", content_id)
            return {"content_id": content_id, "status": "error", "error": "Content not found"}

        lock_token = await _acquire_processing_lock(content.user_id)
        if lock_token is None:
            content.status = "pending"
            content.error_message = None
            content.ignored_reason = None
            await db.commit()
            await _update_progress(
                self,
                content_id,
                "PENDING",
                "queued",
                0,
                message=PROCESSING_QUEUE_WAIT_MESSAGE,
            )
            raise self.retry(
                exc=RuntimeError(PROCESSING_QUEUE_WAIT_MESSAGE),
                countdown=PROCESSING_LOCK_RETRY_DELAY_SECONDS,
            )

        try:
            content.status = "processing"
            content.error_message = None
            content.ignored_reason = None
            await db.commit()

            await _update_progress(self, content_id, "PARSING", "parsing", 10, message="正在解析内容文件")
            text = parse_file(file_path)

            content_date = extract_meeting_date(text, content.title or content.source_file_name or file_path)
            if content_date and not content.content_date:
                content.content_date = content_date
                await db.commit()

            aliases: list[str] = []
            evidence: dict[str, Any] | None = None
            if source_type == "meeting_minutes":
                identity_result = await db.execute(
                    select(SpeakerIdentity).where(
                        SpeakerIdentity.user_id == content.user_id,
                        SpeakerIdentity.display_name == "刘彬",
                    )
                )
                identity = identity_result.scalar_one_or_none()
                aliases = identity.aliases if identity and identity.aliases else []

                await _update_progress(
                    self,
                    content_id,
                    "IDENTIFYING_SPEAKER",
                    "identifying_speaker",
                    30,
                    message="正在识别刘彬发言",
                )
                evidence = scan_speaker_evidence(text, display_name="刘彬", aliases=aliases)

            config_result = await db.execute(
                select(UserModelConfig)
                .where(
                    UserModelConfig.user_id == content.user_id,
                    UserModelConfig.provider == model_config,
                    UserModelConfig.is_enabled == True,
                )
                .order_by(UserModelConfig.is_default.desc())
            )
            user_config = config_result.scalars().first()
            if user_config:
                llm = get_llm_client(
                    provider=model_config,
                    api_key=user_config.api_key,
                    base_url=user_config.base_url,
                    model=user_config.default_model,
                )
            else:
                llm = get_llm_client(provider=model_config)

            processor = ContentProcessor(llm)

            await _update_progress(
                self,
                content_id,
                "SUMMARIZING",
                "summarizing",
                65,
                message="正在生成发言总结",
            )
            processed = await processor.process(
                source_type=source_type,
                text=text,
                owner_identity="刘彬",
                aliases=aliases,
                evidence=evidence,
            )

            if processed["status"] == "ignored":
                content.status = "ignored"
                content.ignored_reason = processed.get("ignored_reason")
                content.summary_text = None
                content.completed_at = now_utc()
                await _replace_content_quotes(db, content, [])
                await db.commit()
                await _update_progress(
                    self,
                    content_id,
                    "IGNORED",
                    "ignored",
                    100,
                    error=content.ignored_reason,
                    message=content.ignored_reason,
                )
                return {
                    "content_id": content.id,
                    "status": "ignored",
                    "stage": "ignored",
                    "percent": 100,
                    "message": content.ignored_reason,
                    "error": content.ignored_reason,
                }

            await _update_progress(
                self,
                content_id,
                "EXTRACTING_QUOTES",
                "extracting_quotes",
                80,
                message="正在整理思想金句",
            )
            await ensure_default_domains(db)
            content.summary_text = processed["summary"]
            content.error_message = None
            content.ignored_reason = None
            await _replace_content_quotes(db, content, processed.get("quotes") or [])
            await db.commit()

            await _update_progress(
                self,
                content_id,
                "BUILDING_GRAPH",
                "building_graph",
                90,
                message="正在构建领域图谱",
            )
            builder = DomainGraphBuilder(db)
            await builder.refresh_graph_for_user(content.user_id)

            content.status = "completed"
            content.completed_at = now_utc()
            await db.commit()
            await _update_progress(self, content_id, "SUCCESS", "completed", 100, message="处理完成")
            return {
                "content_id": content.id,
                "status": "completed",
                "stage": "completed",
                "percent": 100,
                "message": "处理完成",
            }
        except Exception as exc:
            logger.exception("process_content_task failed")
            error_msg = str(exc)
            content_result = await db.execute(select(Content).where(Content.id == content_id))
            failed_content = content_result.scalar_one_or_none()
            if failed_content:
                failed_content.status = "failed"
                failed_content.error_message = error_msg[:1000]
                failed_content.completed_at = now_utc()
                await db.commit()
            await _update_progress(self, content_id, "FAILED", "error", 0, error=error_msg)
            if _should_retry_processing_error(exc):
                raise self.retry(exc=exc) from exc
            raise
        finally:
            if lock_token is not None:
                await _release_processing_lock(content.user_id, lock_token)


async def _update_progress(
    self: SqlAlchemyTask,
    meeting_id: str,
    state: str,
    stage: str | None,
    percent: int,
    error: str | None = None,
    message: str | None = None,
) -> None:
    info = {
        "meeting_id": meeting_id,
        "stage": stage,
        "percent": percent,
        "message": message or f"{stage}: {percent}%",
    }
    if error:
        info["error"] = error
    self.update_state(state=state, meta=info)
