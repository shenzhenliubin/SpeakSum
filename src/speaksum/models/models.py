"""Database models using SQLAlchemy 2.0 DeclarativeBase."""

import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator


def _get_vector_type() -> type[Any]:
    """Return pgvector's Vector type if available, otherwise a Text fallback."""
    try:
        from pgvector.sqlalchemy import Vector
        return Vector
    except Exception:  # pragma: no cover
        class _FallbackVector(TypeDecorator):
            impl = Text
            cache_ok = True

            def __init__(self, dimensions: int | None = None) -> None:
                super().__init__()
                self.dimensions = dimensions

            def process_bind_param(self, value: list[float] | None, dialect: Any) -> str | None:
                if value is None:
                    return None
                import json
                return json.dumps(value)

            def process_result_value(self, value: str | None, dialect: Any) -> list[float] | None:
                if value is None:
                    return None
                import json
                return json.loads(value)

        return _FallbackVector


Vector = _get_vector_type()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc)

    meetings: Mapped[list["Meeting"]] = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")
    topics: Mapped[list["Topic"]] = relationship("Topic", back_populates="user", cascade="all, delete-orphan")
    graph_layouts: Mapped[list["GraphLayout"]] = relationship("GraphLayout", back_populates="user", cascade="all, delete-orphan")
    model_configs: Mapped[list["UserModelConfig"]] = relationship("UserModelConfig", back_populates="user", cascade="all, delete-orphan")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    meeting_date: Mapped[date | None] = mapped_column(nullable=True)
    source_file: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending/processing/completed/failed
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc)

    user: Mapped["User"] = relationship("User", back_populates="meetings")
    speeches: Mapped[list["Speech"]] = relationship("Speech", back_populates="meeting", cascade="all, delete-orphan")


class Speech(Base):
    __tablename__ = "speeches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id: Mapped[str] = mapped_column(ForeignKey("meetings.id"), nullable=False)
    timestamp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    speaker: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    cleaned_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    key_quotes: Mapped[list[str] | None] = mapped_column(JSON, default=list)
    topics: Mapped[list[str] | None] = mapped_column(JSON, default=list)
    sentiment: Mapped[str | None] = mapped_column(String(20), nullable=True)  # positive/negative/neutral/mixed
    word_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc)

    meeting: Mapped["Meeting"] = relationship("Meeting", back_populates="speeches")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    speech_count: Mapped[int] = mapped_column(default=0)
    meeting_count: Mapped[int] = mapped_column(default=0)
    first_appearance: Mapped[date | None] = mapped_column(nullable=True)
    last_appearance: Mapped[date | None] = mapped_column(nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc)

    user: Mapped["User"] = relationship("User", back_populates="topics")


class TopicRelation(Base):
    __tablename__ = "topic_relations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic_a_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), nullable=False)
    topic_b_id: Mapped[str] = mapped_column(ForeignKey("topics.id"), nullable=False)
    co_occurrence_score: Mapped[float] = mapped_column(default=0.0)
    temporal_score: Mapped[float] = mapped_column(default=0.0)
    semantic_score: Mapped[float] = mapped_column(default=0.0)
    total_score: Mapped[float] = mapped_column(default=0.0)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)


class GraphLayout(Base):
    __tablename__ = "graph_layouts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    layout_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, default=dict)
    version: Mapped[int] = mapped_column(default=1)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc)

    user: Mapped["User"] = relationship("User", back_populates="graph_layouts")


class UserModelConfig(Base):
    __tablename__ = "user_model_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # kimi/openai/claude/ollama/custom
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    default_model: Mapped[str] = mapped_column(String(100), nullable=False)
    is_default: Mapped[bool] = mapped_column(default=False)
    is_enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(default=now_utc, onupdate=now_utc)

    user: Mapped["User"] = relationship("User", back_populates="model_configs")
