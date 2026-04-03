"""Celery tasks for async meeting processing."""

import asyncio
import logging
from datetime import date
from typing import Any

from celery import Task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from speaksum.core.config import settings
from speaksum.models.models import Meeting, Speech, Topic
from speaksum.services.file_parser import parse_file
from speaksum.services.knowledge_graph_builder import KnowledgeGraphBuilder
from speaksum.services.llm_client import get_llm_client
from speaksum.services.text_processor import TextProcessor
from speaksum.tasks.celery_app import app

logger = logging.getLogger(__name__)


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
def process_meeting_task(
    self: SqlAlchemyTask,
    meeting_id: str,
    file_path: str,
    speaker_identity: str,
) -> dict[str, Any]:
    return asyncio.run(_process_meeting_async(self, meeting_id, file_path, speaker_identity))


async def _process_meeting_async(
    self: SqlAlchemyTask,
    meeting_id: str,
    file_path: str,
    speaker_identity: str,
) -> dict[str, Any]:
    """Process meeting with detailed state machine.

    State machine: PENDING → PARSING → EXTRACTING → CLEANING → TAGGING → BUILDING_GRAPH → SUCCESS
    """
    async with self.async_session() as db:
        try:
            # Stage 1: PARSING (0% → 10%)
            await _update_progress(self, meeting_id, "PARSING", "parsing", 10)
            text = parse_file(file_path)

            # Stage 2: EXTRACTING (10% → 40%)
            await _update_progress(self, meeting_id, "EXTRACTING", "extracting", 25)
            from speaksum.services.file_parser import extract_speeches
            raw_speeches = extract_speeches(text, speaker_identity)
            await _update_progress(self, meeting_id, "EXTRACTING", "extracting", 40)

            # Stage 3: CLEANING (40% → 70%)
            # For MVP, use Kimi default
            llm = get_llm_client("kimi")
            processor = TextProcessor(llm)

            cleaned_speeches: list[Speech] = []
            total = len(raw_speeches) or 1
            for idx, raw in enumerate(raw_speeches):
                processed = await processor.process_speech(raw)
                speech = Speech(
                    meeting_id=meeting_id,
                    sequence_number=idx + 1,
                    timestamp=processed["timestamp"],
                    speaker=processed["speaker"],
                    is_target_speaker=(processed["speaker"] == speaker_identity),
                    raw_text=processed["raw_text"],
                    cleaned_text=processed.get("cleaned_text"),
                    key_quotes=processed.get("key_quotes"),
                    topics=processed.get("topics"),
                    sentiment=processed.get("sentiment"),
                    word_count=processed["word_count"],
                )
                cleaned_speeches.append(speech)
                percent = 40 + int((idx + 1) / total * 30)
                await _update_progress(self, meeting_id, "CLEANING", "cleaning", percent)

            db.add_all(cleaned_speeches)
            await db.commit()

            # Stage 4: TAGGING (70% → 75%)
            await _update_progress(self, meeting_id, "TAGGING", "tagging", 75)

            # Update topics
            meeting_result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
            meeting = meeting_result.scalar_one()
            all_topics: set[str] = set()
            for speech in cleaned_speeches:
                all_topics.update(speech.topics or [])

            for topic_name in all_topics:
                topic_result = await db.execute(
                    select(Topic).where(Topic.user_id == meeting.user_id, Topic.name == topic_name)
                )
                topic = topic_result.scalar_one_or_none()
                topic_speeches = [s for s in cleaned_speeches if topic_name in (s.topics or [])]
                meeting_dates = [meeting.meeting_date] if meeting.meeting_date else []
                if topic:
                    topic.speech_count += len(topic_speeches)
                    topic.meeting_count += 1
                    if meeting_dates:
                        topic.last_appearance = max([topic.last_appearance or date.min] + meeting_dates)
                else:
                    db.add(
                        Topic(
                            user_id=meeting.user_id,
                            name=topic_name,
                            speech_count=len(topic_speeches),
                            meeting_count=1,
                            first_appearance=meeting_dates[0] if meeting_dates else None,
                            last_appearance=meeting_dates[0] if meeting_dates else None,
                        )
                    )
            await db.commit()

            # Stage 5: BUILDING_GRAPH (75% → 90%)
            await _update_progress(self, meeting_id, "BUILDING_GRAPH", "building graph", 90)
            builder = KnowledgeGraphBuilder(db)
            graph = await builder.build_graph(meeting.user_id)
            await builder.save_layout(meeting.user_id, graph)

            # Stage 6: SUCCESS (100%)
            meeting.status = "completed"
            await db.commit()

            await _update_progress(self, meeting_id, "SUCCESS", "completed", 100)
            return {"meeting_id": meeting_id, "status": "completed"}

        except Exception as exc:
            logger.exception("process_meeting_task failed")
            error_msg = str(exc)
            meeting_result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
            failed_meeting = meeting_result.scalar_one_or_none()
            if failed_meeting:
                failed_meeting.status = "failed"
                failed_meeting.error_message = error_msg[:1000]  # Limit to 1000 chars
                await db.commit()
            await _update_progress(self, meeting_id, "FAILED", "error", 0, error=error_msg)
            raise self.retry(exc=exc) from exc


async def _update_progress(
    self: SqlAlchemyTask,
    meeting_id: str,
    state: str,
    stage: str | None,
    percent: int,
    error: str | None = None,
) -> None:
    info = {
        "meeting_id": meeting_id,
        "stage": stage,
        "percent": percent,
        "message": f"{stage}: {percent}%",
    }
    if error:
        info["error"] = error
    self.update_state(state=state, meta=info)
