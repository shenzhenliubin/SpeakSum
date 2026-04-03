# SpeakSum 后端实现 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的 SpeakSum FastAPI 后端，包括数据库模型、RESTful API、业务服务、Celery 异步任务和单元测试，覆盖率达到 80%+。

**Architecture:** 采用 FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL/pgvector + Celery + Redis 架构。服务层封装业务逻辑，API 层负责路由和依赖注入，测试使用 SQLite 内存库 + Mock 外部依赖。

**Tech Stack:** Python 3.10+, FastAPI, SQLAlchemy 2.0, asyncpg, pgvector, Pydantic v2, Celery, Redis, pytest, pytest-asyncio

---

## File Structure Overview

```
src/speaksum/
├── main.py
├── core/
│   ├── config.py
│   ├── database.py
│   ├── security.py
│   └── exceptions.py
├── models/
│   └── models.py
├── schemas/
│   └── schemas.py
├── api/
│   ├── __init__.py
│   ├── upload.py
│   ├── meetings.py
│   ├── speeches.py
│   ├── knowledge_graph.py
│   └── settings.py
├── services/
│   ├── file_parser.py
│   ├── llm_client.py
│   ├── text_processor.py
│   └── knowledge_graph_builder.py
└── tasks/
    ├── celery_app.py
    └── celery_tasks.py
tests/
├── conftest.py
├── test_models.py
├── test_api_upload.py
├── test_api_meetings.py
├── test_llm_client.py
└── test_text_processor.py
```

---

## Chunk 1: Project Setup & Dependencies

### Task 1.1: Update pyproject.toml dependencies

**Files:**
- Modify: `pyproject.toml`

**Context:** The current project only has `typer`, `rich`, `pydantic`. We need to add all backend dependencies.

- [ ] **Step 1: Add production and dev dependencies**

Edit `pyproject.toml` dependencies to:

```toml
[project]
name = "speaksum"
version = "0.1.0"
description = "会议纪要智能处理系统 - 提取发言、清理口语、追踪思考演变"
readme = "README.md"
requires-python = ">=3.10"
dependencies = [
    "typer>=0.9.0",
    "rich>=13.0.0",
    "pydantic>=2.6.0",
    "pydantic-settings>=2.1.0",
    "fastapi>=0.110.0",
    "uvicorn[standard]>=0.27.0",
    "python-multipart>=0.0.9",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "pgvector>=0.2.0",
    "celery[redis]>=5.3.0",
    "redis>=5.0.0",
    "openai>=1.12.0",
    "anthropic>=0.18.0",
    "httpx>=0.27.0",
    "python-docx>=1.1.0",
    "python-magic>=0.4.27",
    "chardet>=5.2.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "python-dateutil>=2.8.2",
    "cryptography>=42.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.1.0",
    "mypy>=1.7.0",
    "httpx>=0.27.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.ruff]
line-length = 88
target-version = "py310"

[tool.mypy]
python_version = "3.10"
strict = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
addopts = "-v --cov=src/speaksum --cov-report=term-missing"
asyncio_mode = "auto"
```

- [ ] **Step 2: Run uv sync to install dependencies**

Run: `uv sync --extra dev`
Expected: All dependencies install successfully with no errors.

- [ ] **Step 3: Create directory structure**

Run:
```bash
mkdir -p src/speaksum/core src/speaksum/models src/speaksum/schemas src/speaksum/api src/speaksum/services src/speaksum/tasks
```

- [ ] **Step 4: Commit setup**

```bash
git add pyproject.toml
uv lock
git add uv.lock
git commit -m "chore: add FastAPI backend dependencies"
```

---

## Chunk 2: Core Infrastructure

### Task 2.1: Configuration Management

**Files:**
- Create: `src/speaksum/core/config.py`

- [ ] **Step 1: Write config.py**

```python
"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite+aiosqlite:///./speaksum.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ENCRYPTION_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # Default LLM API keys (optional, user configs preferred)
    KIMI_API_KEY: str | None = None
    OPENAI_API_KEY: str | None = None
    CLAUDE_API_KEY: str | None = None

    # CORS
    CORS_ORIGINS: list[str] = ["*"]


settings = Settings()
```

### Task 2.2: Database Connection & Session

**Files:**
- Create: `src/speaksum/core/database.py`
- Create: `src/speaksum/core/exceptions.py`

- [ ] **Step 2: Write exceptions.py**

```python
"""Custom exceptions for SpeakSum."""


class SpeakSumException(Exception):
    """Base exception for application errors."""

    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
```

- [ ] **Step 3: Write database.py**

```python
"""Database connection and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from speaksum.core.config import settings
from speaksum.core.exceptions import SpeakSumException

async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session for FastAPI Depends."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except SpeakSumException:
            await session.rollback()
            raise
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### Task 2.3: Security (JWT + current user)

**Files:**
- Create: `src/speaksum/core/security.py`

- [ ] **Step 4: Write security.py**

```python
"""Security utilities: JWT, password hashing, current user dependency."""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from speaksum.core.config import settings

security_scheme = HTTPBearer(auto_error=False)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def verify_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme)) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return verify_token(credentials.credentials)
```

- [ ] **Step 5: Commit core infrastructure**

```bash
git add src/speaksum/core/
git commit -m "feat: add core config, database, and security infrastructure"
```

---

## Chunk 3: Database Models

### Task 3.1: SQLAlchemy 2.0 Models with pgvector compatibility

**Files:**
- Create: `src/speaksum/models/models.py`

**Important:** Use SQLAlchemy 2.0 style with `Mapped[]`. For pgvector compatibility in SQLite tests, use a helper that gracefully falls back when pgvector is not available.

- [ ] **Step 1: Write models.py**

```python
"""Database models using SQLAlchemy 2.0 DeclarativeBase."""

import uuid
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import JSON, ForeignKey, String, Text, Time, inspect
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator, UserDefinedType


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
```

- [ ] **Step 2: Commit models**

```bash
git add src/speaksum/models/models.py
git commit -m "feat: add SQLAlchemy 2.0 models with pgvector fallback"
```

---

## Chunk 4: Pydantic Schemas

### Task 4.1: Request/Response DTOs

**Files:**
- Create: `src/speaksum/schemas/schemas.py`

- [ ] **Step 1: Write schemas.py**

```python
"""Pydantic v2 request and response schemas."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    created_at: datetime


class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    meeting_date: date | None = None
    source_file: str = Field(..., min_length=1, max_length=255)


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    meeting_date: date | None
    source_file: str
    file_size: int
    status: str
    created_at: datetime
    updated_at: datetime
    speeches: list["SpeechResponse"] | None = None


class MeetingList(BaseModel):
    total: int
    items: list[MeetingResponse]


class SpeechResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    timestamp: str | None
    speaker: str
    raw_text: str
    cleaned_text: str | None
    key_quotes: list[str] | None
    topics: list[str] | None
    sentiment: str | None
    word_count: int
    created_at: datetime
    updated_at: datetime


class SpeechUpdate(BaseModel):
    cleaned_text: str | None = None
    key_quotes: list[str] | None = None
    topics: list[str] | None = None
    sentiment: str | None = None

    @field_validator("sentiment")
    @classmethod
    def validate_sentiment(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"positive", "negative", "neutral", "mixed"}
        if v not in allowed:
            raise ValueError(f"sentiment must be one of {allowed}")
        return v


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    speech_count: int
    meeting_count: int
    first_appearance: date | None
    last_appearance: date | None
    created_at: datetime
    updated_at: datetime


class TopicCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class UploadRequest(BaseModel):
    speaker_identity: str = Field(..., min_length=1, max_length=100)
    meeting_title: str | None = Field(None, max_length=255)
    meeting_date: date | None = None


class ProcessingStatus(BaseModel):
    task_id: str
    status: str  # PENDING/PROCESSING/SUCCESS/FAILED
    stage: str | None = None
    percent: int = 0
    message: str | None = None
    meeting_id: str | None = None
    error_message: str | None = None


class KnowledgeGraphNode(BaseModel):
    id: str
    type: str  # topic/speech
    label: str
    x: float = 0.0
    y: float = 0.0
    size: float | None = None


class KnowledgeGraphEdge(BaseModel):
    source: str
    target: str
    type: str  # contains/related/temporal
    strength: float | None = None


class KnowledgeGraphData(BaseModel):
    nodes: list[KnowledgeGraphNode]
    edges: list[KnowledgeGraphEdge]


class ModelConfigCreate(BaseModel):
    provider: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=100)
    api_key: str | None = Field(None, max_length=500)
    base_url: str | None = Field(None, max_length=500)
    default_model: str = Field(..., min_length=1, max_length=100)
    is_default: bool = False
    is_enabled: bool = True


class ModelConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    provider: str
    name: str
    base_url: str | None
    default_model: str
    is_default: bool
    is_enabled: bool
    created_at: datetime
    updated_at: datetime
```

- [ ] **Step 2: Commit schemas**

```bash
git add src/speaksum/schemas/schemas.py
git commit -m "feat: add Pydantic v2 request/response schemas"
```

---

## Chunk 5: File Parser & LLM Client Services

### Task 5.1: File Parser Service

**Files:**
- Create: `src/speaksum/services/file_parser.py`

- [ ] **Step 1: Write file_parser.py**

```python
"""File parsing service supporting .txt, .md, .doc, .docx."""

import os
import re
import subprocess
from pathlib import Path
from typing import Any

import chardet

from speaksum.core.config import settings
from speaksum.core.exceptions import SpeakSumException


ALLOWED_EXTENSIONS = {".txt", ".md", ".doc", ".docx"}
ALLOWED_MIME_PREFIXES = ("text/", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")


def validate_file_type(file_path: str) -> None:
    """Validate file extension and MIME type."""
    ext = Path(file_path).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise SpeakSumException(f"Unsupported file format: {ext}", status_code=400)

    try:
        import magic
        mime = magic.from_file(file_path, mime=True)
    except Exception:
        mime = None

    if mime and not mime.startswith(ALLOWED_MIME_PREFIXES):
        raise SpeakSumException(f"Unsupported MIME type: {mime}", status_code=400)


def _detect_encoding(file_path: str) -> str:
    with open(file_path, "rb") as f:
        raw = f.read(4096)
    result = chardet.detect(raw)
    return result.get("encoding") or "utf-8"


def parse_txt(file_path: str) -> str:
    validate_file_type(file_path)
    encoding = _detect_encoding(file_path)
    with open(file_path, "r", encoding=encoding, errors="replace") as f:
        return f.read()


def parse_md(file_path: str) -> str:
    validate_file_type(file_path)
    return parse_txt(file_path)


def parse_docx(file_path: str) -> str:
    validate_file_type(file_path)
    try:
        from docx import Document
    except ImportError as exc:  # pragma: no cover
        raise SpeakSumException("python-docx not installed", status_code=500) from exc

    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs]
    return "\n".join(paragraphs)


def parse_doc(file_path: str) -> str:
    validate_file_type(file_path)
    # Try antiword first, otherwise libreoffice conversion
    try:
        result = subprocess.run(
            ["antiword", file_path],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        return result.stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # Fallback: convert to docx with libreoffice
    temp_dir = Path(settings.UPLOAD_DIR) / ".temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            ["libreoffice", "--headless", "--convertTo", "docx", "--outdir", str(temp_dir), file_path],
            capture_output=True,
            timeout=60,
            check=True,
        )
        base = Path(file_path).stem
        converted = temp_dir / f"{base}.docx"
        if converted.exists():
            text = parse_docx(str(converted))
            converted.unlink()
            return text
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    raise SpeakSumException("Failed to parse .doc file. Please install antiword or libreoffice.", status_code=400)


def parse_file(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext == ".txt" or ext == ".md":
        return parse_txt(file_path)
    if ext == ".docx":
        return parse_docx(file_path)
    if ext == ".doc":
        return parse_doc(file_path)
    raise SpeakSumException(f"Unsupported file format: {ext}", status_code=400)


SPEECH_PATTERN = re.compile(r"\[(\d{1,2}:\d{2}(:\d{2})?)\]\s*([^：:]+)[：:]\s*(.*)")


def extract_speeches(text: str, target_speaker: str) -> list[dict[str, Any]]:
    """Extract speeches from transcript text matching target speaker."""
    speeches = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = SPEECH_PATTERN.match(line)
        if not match:
            continue
        timestamp = match.group(1)
        speaker = match.group(3).strip()
        content = match.group(4).strip()
        if speaker != target_speaker:
            continue
        speeches.append({
            "timestamp": timestamp,
            "speaker": speaker,
            "raw_text": content,
            "word_count": len(content),
        })
    return speeches
```

### Task 5.2: LLM Client Service

**Files:**
- Create: `src/speaksum/services/llm_client.py`

- [ ] **Step 2: Write llm_client.py**

```python
"""Multi-provider LLM client abstraction."""

import json
import os
from abc import ABC, abstractmethod
from typing import Any

import httpx

from speaksum.core.config import settings
from speaksum.core.exceptions import SpeakSumException


def _default_count_tokens(text: str) -> int:
    # Conservative estimate: ~1.2 tokens per CN char, ~0.25 per EN word
    cn_count = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    en_count = len([w for w in text.split() if w.isascii()])
    return int(cn_count * 1.2 + en_count * 0.25)


class BaseLLMClient(ABC):
    @abstractmethod
    async def generate(self, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int | None = None) -> str:
        raise NotImplementedError

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        raise NotImplementedError

    def count_tokens(self, text: str) -> int:
        return _default_count_tokens(text)

    def get_context_limit(self) -> int:
        return 128000


class KimiClient(BaseLLMClient):
    def __init__(self, api_key: str | None = None, base_url: str | None = None, model: str = "moonshot-v1-128k") -> None:
        self.api_key = api_key or settings.KIMI_API_KEY or ""
        self.base_url = base_url or "https://api.moonshot.cn/v1"
        self.model = model
        if not self.api_key:
            raise SpeakSumException("Kimi API key not configured", status_code=400)

    async def generate(self, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int | None = None) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def embed(self, text: str) -> list[float]:
        # Kimi may not provide embedding; fallback to OpenAI-compatible endpoint if available
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                json={"model": "text-embedding-3-small", "input": text},
            )
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["embedding"]


class OpenAIClient(BaseLLMClient):
    def __init__(self, api_key: str | None = None, base_url: str | None = None, model: str = "gpt-4-turbo") -> None:
        self.api_key = api_key or settings.OPENAI_API_KEY or ""
        try:
            from openai import AsyncOpenAI
        except ImportError as exc:  # pragma: no cover
            raise SpeakSumException("openai package not installed", status_code=500) from exc
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=base_url)
        self.model = model
        if not self.api_key:
            raise SpeakSumException("OpenAI API key not configured", status_code=400)

    async def generate(self, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int | None = None) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def embed(self, text: str) -> list[float]:
        response = await self.client.embeddings.create(model="text-embedding-3-small", input=text)
        return response.data[0].embedding


class ClaudeClient(BaseLLMClient):
    def __init__(self, api_key: str | None = None, base_url: str | None = None, model: str = "claude-3-sonnet-20240229") -> None:
        self.api_key = api_key or settings.CLAUDE_API_KEY or ""
        try:
            from anthropic import AsyncAnthropic
        except ImportError as exc:  # pragma: no cover
            raise SpeakSumException("anthropic package not installed", status_code=500) from exc
        self.client = AsyncAnthropic(api_key=self.api_key, base_url=base_url)
        self.model = model
        if not self.api_key:
            raise SpeakSumException("Claude API key not configured", status_code=400)

    async def generate(self, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int | None = None) -> str:
        system = ""
        filtered = []
        for m in messages:
            if m.get("role") == "system":
                system = m.get("content", "")
            else:
                filtered.append({"role": m["role"], "content": m["content"]})
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            system=system,
            messages=filtered,  # type: ignore[arg-type]
        )
        return response.content[0].text  # type: ignore[index,union-attr]

    async def embed(self, text: str) -> list[float]:
        # Claude does not provide embeddings directly; raise for now
        raise SpeakSumException("Claude does not support embeddings in this implementation", status_code=400)

    def get_context_limit(self) -> int:
        return 200000


class OllamaClient(BaseLLMClient):
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "llama2:13b") -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(self, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int | None = None) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")

    async def embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.model, "prompt": text},
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("embedding", [])

    def get_context_limit(self) -> int:
        return 32768


def get_llm_client(provider: str, api_key: str | None = None, base_url: str | None = None, model: str | None = None) -> BaseLLMClient:
    provider = provider.lower()
    if provider == "kimi":
        return KimiClient(api_key=api_key, base_url=base_url, model=model or "moonshot-v1-128k")
    if provider == "openai":
        return OpenAIClient(api_key=api_key, base_url=base_url, model=model or "gpt-4-turbo")
    if provider == "claude":
        return ClaudeClient(api_key=api_key, base_url=base_url, model=model or "claude-3-sonnet-20240229")
    if provider == "ollama":
        return OllamaClient(base_url=base_url or "http://localhost:11434", model=model or "llama2:13b")
    raise SpeakSumException(f"Unknown LLM provider: {provider}", status_code=400)
```

- [ ] **Step 3: Commit services chunk 1**

```bash
git add src/speaksum/services/
git commit -m "feat: add file parser and multi-provider LLM client services"
```

---

## Chunk 6: Text Processor & Knowledge Graph Builder

### Task 6.1: Text Processor Service

**Files:**
- Create: `src/speaksum/services/text_processor.py`

- [ ] **Step 1: Write text_processor.py**

```python
"""Text processing service: cleaning, key quotes, topics, sentiment."""

import json
from typing import Any

from speaksum.core.exceptions import SpeakSumException
from speaksum.services.llm_client import BaseLLMClient


class TextProcessor:
    def __init__(self, llm_client: BaseLLMClient) -> None:
        self.llm = llm_client

    async def clean_colloquial(self, text: str) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                    "你是一位专业的中文文本编辑。请去除会议转写文本中的语气词、口头禅和重复词，"
                    "修正明显的错别字，保持原意不变。只返回清理后的文本，不要解释。"
                ),
            },
            {"role": "user", "content": text},
        ]
        return await self.llm.generate(messages, temperature=0.3)

    async def extract_key_quotes(self, text: str) -> list[str]:
        messages = [
            {
                "role": "system",
                "content": (
                    "请从以下发言中提取 0-3 条金句。金句应精炼概括核心观点、书面化表达、"
                    "去除具体人名和上下文依赖、每条不超过 50 字。输出严格 JSON 格式: {\"quotes\": [...]}"
                ),
            },
            {"role": "user", "content": text},
        ]
        result = await self.llm.generate(messages, temperature=0.5)
        try:
            data = json.loads(result)
            quotes = data.get("quotes", [])
            if isinstance(quotes, list):
                return [str(q) for q in quotes]
        except json.JSONDecodeError:
            pass
        return []

    async def extract_topics(self, text: str) -> list[str]:
        messages = [
            {
                "role": "system",
                "content": (
                    "请为以下发言提取 1-3 个话题标签，标签应简洁（2-4字），使用名词短语。"
                    "输出严格 JSON 格式: {\"topics\": [...]}"
                ),
            },
            {"role": "user", "content": text},
        ]
        result = await self.llm.generate(messages, temperature=0.5)
        try:
            data = json.loads(result)
            topics = data.get("topics", [])
            if isinstance(topics, list):
                return [str(t) for t in topics]
        except json.JSONDecodeError:
            pass
        return []

    async def analyze_sentiment(self, text: str) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                    "分析以下发言的情感倾向，只返回一个单词: positive / negative / neutral / mixed"
                ),
            },
            {"role": "user", "content": text},
        ]
        result = (await self.llm.generate(messages, temperature=0.3)).strip().lower()
        allowed = {"positive", "negative", "neutral", "mixed"}
        if result not in allowed:
            return "neutral"
        return result

    async def process_speech(self, speech: dict[str, Any]) -> dict[str, Any]:
        raw = speech.get("raw_text", "")
        if not raw:
            raise SpeakSumException("Empty speech text", status_code=400)

        cleaned = await self.clean_colloquial(raw)
        quotes = await self.extract_key_quotes(cleaned)
        topics = await self.extract_topics(cleaned)
        sentiment = await self.analyze_sentiment(cleaned)

        speech["cleaned_text"] = cleaned
        speech["key_quotes"] = quotes
        speech["topics"] = topics
        speech["sentiment"] = sentiment
        return speech
```

### Task 6.2: Knowledge Graph Builder Service

**Files:**
- Create: `src/speaksum/services/knowledge_graph_builder.py`

- [ ] **Step 2: Write knowledge_graph_builder.py**

```python
"""Knowledge graph builder: topic clustering, relations, layout data."""

import math
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from speaksum.models.models import GraphLayout, Meeting, Speech, Topic, TopicRelation
from speaksum.schemas.schemas import KnowledgeGraphData, KnowledgeGraphEdge, KnowledgeGraphNode


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class KnowledgeGraphBuilder:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def build_graph(self, user_id: str) -> KnowledgeGraphData:
        topics_result = await self.db.execute(
            select(Topic).where(Topic.user_id == user_id).order_by(Topic.created_at)
        )
        topics = list(topics_result.scalars().all())

        speeches_result = await self.db.execute(
            select(Speech)
            .join(Meeting)
            .where(Meeting.user_id == user_id)
            .order_by(Speech.created_at)
        )
        speeches = list(speeches_result.scalars().all())

        nodes: list[KnowledgeGraphNode] = []
        edges: list[KnowledgeGraphEdge] = []

        # Topic nodes
        topic_positions: dict[str, tuple[float, float]] = {}
        angle_step = 2 * math.pi / max(len(topics), 1)
        radius = 200.0
        for idx, topic in enumerate(topics):
            angle = idx * angle_step
            x = radius * math.cos(angle)
            y = radius * math.sin(angle)
            topic_positions[topic.id] = (x, y)
            size = math.sqrt(max(topic.speech_count, 1)) * 15
            nodes.append(
                KnowledgeGraphNode(
                    id=topic.id,
                    type="topic",
                    label=topic.name,
                    x=x,
                    y=y,
                    size=size,
                )
            )

        # Speech nodes inside topic islands
        speech_positions: dict[str, tuple[float, float]] = {}
        topic_speech_count: dict[str, int] = {}
        for speech in speeches:
            for topic_name in speech.topics or []:
                topic = next((t for t in topics if t.name == topic_name), None)
                if not topic:
                    continue
                topic_speech_count[topic.id] = topic_speech_count.get(topic.id, 0) + 1
                tx, ty = topic_positions[topic.id]
                offset = topic_speech_count[topic.id] * 30
                sx = tx + 20
                sy = ty + offset
                speech_positions[speech.id] = (sx, sy)
                nodes.append(
                    KnowledgeGraphNode(
                        id=speech.id,
                        type="speech",
                        label=(speech.cleaned_text or speech.raw_text)[:20] + "...",
                        x=sx,
                        y=sy,
                        size=6,
                    )
                )
                edges.append(
                    KnowledgeGraphEdge(
                        source=topic.id,
                        target=speech.id,
                        type="contains",
                    )
                )

        # Topic relations
        rel_result = await self.db.execute(
            select(TopicRelation)
            .join(Topic, TopicRelation.topic_a_id == Topic.id)
            .where(Topic.user_id == user_id)
            .where(TopicRelation.total_score >= 0.2)
        )
        for rel in rel_result.scalars().all():
            edges.append(
                KnowledgeGraphEdge(
                    source=rel.topic_a_id,
                    target=rel.topic_b_id,
                    type="related",
                    strength=rel.total_score,
                )
            )

        return KnowledgeGraphData(nodes=nodes, edges=edges)

    async def compute_topic_relations(self, user_id: str) -> None:
        result = await self.db.execute(select(Topic).where(Topic.user_id == user_id))
        topics = list(result.scalars().all())

        for i, topic_a in enumerate(topics):
            for topic_b in topics[i + 1 :]:
                # Co-occurrence
                co_occurrence = 0
                meetings_a: set[str] = set()
                meetings_b: set[str] = set()
                for speech in await self._get_topic_speeches(topic_a.name, user_id):
                    meetings_a.add(speech.meeting_id)
                for speech in await self._get_topic_speeches(topic_b.name, user_id):
                    meetings_b.add(speech.meeting_id)
                co_occurrence = len(meetings_a & meetings_b)
                total_meetings = len(meetings_a | meetings_b) or 1
                co_score = co_occurrence / total_meetings

                # Temporal
                dates_a = [m.meeting_date for m in await self._get_topic_meetings(topic_a.name, user_id) if m.meeting_date]
                dates_b = [m.meeting_date for m in await self._get_topic_meetings(topic_b.name, user_id) if m.meeting_date]
                temporal_score = 0.0
                if dates_a and dates_b:
                    min_diff = min(abs((a - b).days) for a in dates_a for b in dates_b)
                    temporal_score = 1.0 / (min_diff + 1)

                # Semantic
                emb_a = topic_a.embedding or []
                emb_b = topic_b.embedding or []
                semantic_score = _cosine_similarity(emb_a, emb_b)

                total = 0.4 * co_score + 0.2 * temporal_score + 0.4 * semantic_score

                existing = await self.db.execute(
                    select(TopicRelation).where(
                        ((TopicRelation.topic_a_id == topic_a.id) & (TopicRelation.topic_b_id == topic_b.id))
                        | ((TopicRelation.topic_a_id == topic_b.id) & (TopicRelation.topic_b_id == topic_a.id))
                    )
                )
                rel = existing.scalar_one_or_none()
                if rel:
                    rel.co_occurrence_score = co_score
                    rel.temporal_score = temporal_score
                    rel.semantic_score = semantic_score
                    rel.total_score = total
                else:
                    self.db.add(
                        TopicRelation(
                            topic_a_id=topic_a.id,
                            topic_b_id=topic_b.id,
                            co_occurrence_score=co_score,
                            temporal_score=temporal_score,
                            semantic_score=semantic_score,
                            total_score=total,
                        )
                    )
        await self.db.commit()

    async def _get_topic_speeches(self, topic_name: str, user_id: str) -> list[Speech]:
        result = await self.db.execute(
            select(Speech)
            .join(Meeting)
            .where(Meeting.user_id == user_id)
            .where(Speech.topics.contains([topic_name]))
        )
        return list(result.scalars().all())

    async def _get_topic_meetings(self, topic_name: str, user_id: str) -> list[Meeting]:
        result = await self.db.execute(
            select(Meeting)
            .join(Speech)
            .where(Meeting.user_id == user_id)
            .where(Speech.topics.contains([topic_name]))
            .distinct()
        )
        return list(result.scalars().all())

    async def save_layout(self, user_id: str, data: KnowledgeGraphData) -> None:
        result = await self.db.execute(select(GraphLayout).where(GraphLayout.user_id == user_id))
        layout = result.scalar_one_or_none()
        layout_dict = {
            "nodes": [n.model_dump() for n in data.nodes],
            "edges": [e.model_dump() for e in data.edges],
        }
        if layout:
            layout.layout_data = layout_dict
            layout.version += 1
        else:
            self.db.add(GraphLayout(user_id=user_id, layout_data=layout_dict, version=1))
        await self.db.commit()
```

- [ ] **Step 3: Commit services chunk 2**

```bash
git add src/speaksum/services/
git commit -m "feat: add text processor and knowledge graph builder services"
```

---

## Chunk 7: API Routes

### Task 7.1: API Init + Upload Router

**Files:**
- Create: `src/speaksum/api/__init__.py`
- Create: `src/speaksum/api/upload.py`

- [ ] **Step 1: Write api/__init__.py**

```python
"""API routers package."""

from speaksum.api.knowledge_graph import router as knowledge_graph_router
from speaksum.api.meetings import router as meetings_router
from speaksum.api.settings import router as settings_router
from speaksum.api.speeches import router as speeches_router
from speaksum.api.upload import router as upload_router

__all__ = [
    "upload_router",
    "meetings_router",
    "speeches_router",
    "knowledge_graph_router",
    "settings_router",
]
```

- [ ] **Step 2: Write api/upload.py**

```python
"""Upload and processing API."""

import asyncio
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.config import settings
from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting
from speaksum.schemas.schemas import ProcessingStatus
from speaksum.tasks.celery_app import app as celery_app

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    file: UploadFile = File(...),
    speaker_identity: str = "",
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    if not speaker_identity:
        raise HTTPException(status_code=400, detail="speaker_identity is required")

    user_id = current_user.get("sub", "")
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "txt").suffix
    file_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / file_name

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    with open(file_path, "wb") as f:
        f.write(content)

    meeting = Meeting(
        user_id=user_id,
        title=file.filename or "未命名会议",
        source_file=str(file_path),
        file_size=len(content),
        status="pending",
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)

    task = celery_app.send_task(
        "speaksum.tasks.celery_tasks.process_meeting_task",
        args=[str(meeting.id), str(file_path), speaker_identity],
    )

    return {"task_id": task.id, "meeting_id": meeting.id}


@router.get("/{task_id}/status")
async def get_task_status(
    task_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ProcessingStatus:
    result = celery_app.AsyncResult(task_id)
    info = result.info or {}
    return ProcessingStatus(
        task_id=task_id,
        status=result.state,
        stage=info.get("stage"),
        percent=info.get("percent", 0),
        message=info.get("message"),
        meeting_id=info.get("meeting_id"),
        error_message=str(info.get("error")) if info.get("error") else None,
    )
```

### Task 7.2: Meetings Router

**Files:**
- Create: `src/speaksum/api/meetings.py`

- [ ] **Step 3: Write api/meetings.py**

```python
"""Meeting management API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting, Speech
from speaksum.schemas.schemas import MeetingList, MeetingResponse

router = APIRouter(prefix="/api/v1/meetings", tags=["Meetings"])


@router.get("")
async def list_meetings(
    q: str | None = Query(None, description="Search query"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MeetingList:
    user_id = current_user.get("sub", "")
    base_stmt = select(Meeting).where(Meeting.user_id == user_id).order_by(Meeting.created_at.desc())

    count_stmt = select(func.count(Meeting.id)).where(Meeting.user_id == user_id)

    if q:
        count_stmt = count_stmt.where(Meeting.title.ilike(f"%{q}%"))
        base_stmt = base_stmt.where(Meeting.title.ilike(f"%{q}%"))

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    result = await db.execute(base_stmt.offset(offset).limit(size).options(selectinload(Meeting.speeches)))
    meetings = result.scalars().all()

    # Filter speeches in Python for search relevance scoring (MVP simplification)
    items = []
    for m in meetings:
        mr = MeetingResponse.model_validate(m)
        items.append(mr)

    return MeetingList(total=total, items=items)


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MeetingResponse:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.user_id == user_id)
        .options(selectinload(Meeting.speeches))
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return MeetingResponse.model_validate(meeting)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    user_id = current_user.get("sub", "")
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.user_id == user_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await db.delete(meeting)
    await db.commit()
```

### Task 7.3: Speeches Router

**Files:**
- Create: `src/speaksum/api/speeches.py`

- [ ] **Step 4: Write api/speeches.py**

```python
"""Speech management API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting, Speech
from speaksum.schemas.schemas import SpeechResponse, SpeechUpdate

router = APIRouter(prefix="/api/v1", tags=["Speeches"])


@router.get("/meetings/{meeting_id}/speeches")
async def list_speeches(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[SpeechResponse]:
    user_id = current_user.get("sub", "")
    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.user_id == user_id)
    )
    meeting = meeting_result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    result = await db.execute(select(Speech).where(Speech.meeting_id == meeting_id).order_by(Speech.timestamp))
    speeches = result.scalars().all()
    return [SpeechResponse.model_validate(s) for s in speeches]


@router.get("/speeches/{speech_id}")
async def get_speech(
    speech_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SpeechResponse:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(Speech)
        .join(Meeting)
        .where(Speech.id == speech_id, Meeting.user_id == user_id)
    )
    speech = result.scalar_one_or_none()
    if not speech:
        raise HTTPException(status_code=404, detail="Speech not found")
    return SpeechResponse.model_validate(speech)


@router.patch("/speeches/{speech_id}")
async def update_speech(
    speech_id: str,
    payload: SpeechUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SpeechResponse:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(Speech)
        .join(Meeting)
        .where(Speech.id == speech_id, Meeting.user_id == user_id)
    )
    speech = result.scalar_one_or_none()
    if not speech:
        raise HTTPException(status_code=404, detail="Speech not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(speech, field, value)

    await db.commit()
    await db.refresh(speech)
    return SpeechResponse.model_validate(speech)
```

### Task 7.4: Knowledge Graph + Settings Routers

**Files:**
- Create: `src/speaksum/api/knowledge_graph.py`
- Create: `src/speaksum/api/settings.py`

- [ ] **Step 5: Write api/knowledge_graph.py**

```python
"""Knowledge graph API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting, Speech, Topic
from speaksum.schemas.schemas import KnowledgeGraphData, SpeechResponse
from speaksum.services.knowledge_graph_builder import KnowledgeGraphBuilder

router = APIRouter(prefix="/api/v1/knowledge-graph", tags=["Knowledge Graph"])


@router.get("")
async def get_knowledge_graph(
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> KnowledgeGraphData:
    user_id = current_user.get("sub", "")
    builder = KnowledgeGraphBuilder(db)
    return await builder.build_graph(user_id)


@router.get("/topics/{topic_id}/speeches")
async def get_topic_speeches(
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[SpeechResponse]:
    user_id = current_user.get("sub", "")
    topic_result = await db.execute(
        select(Topic).where(Topic.id == topic_id, Topic.user_id == user_id)
    )
    topic = topic_result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    result = await db.execute(
        select(Speech)
        .join(Meeting)
        .where(Meeting.user_id == user_id)
        .where(Speech.topics.contains([topic.name]))
        .order_by(Speech.timestamp)
    )
    speeches = result.scalars().all()
    return [SpeechResponse.model_validate(s) for s in speeches]
```

- [ ] **Step 6: Write api/settings.py**

```python
"""User settings API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import UserModelConfig
from speaksum.schemas.schemas import ModelConfigCreate, ModelConfigResponse

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


def _encrypt_key(key: str | None) -> str | None:
    if not key:
        return None
    try:
        from cryptography.fernet import Fernet
        from speaksum.core.config import settings
        if not settings.ENCRYPTION_KEY:
            return key
        f = Fernet(settings.ENCRYPTION_KEY.encode()[:32].ljust(32, b"0")[:32])
        return f.encrypt(key.encode()).decode()
    except Exception:
        return key


def _decrypt_key(encrypted: str | None) -> str | None:
    if not encrypted:
        return None
    try:
        from cryptography.fernet import Fernet
        from speaksum.core.config import settings
        if not settings.ENCRYPTION_KEY:
            return encrypted
        f = Fernet(settings.ENCRYPTION_KEY.encode()[:32].ljust(32, b"0")[:32])
        return f.decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted


@router.get("/model")
async def list_model_configs(
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ModelConfigResponse]:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(UserModelConfig).where(UserModelConfig.user_id == user_id).order_by(UserModelConfig.created_at)
    )
    configs = result.scalars().all()
    return [ModelConfigResponse.model_validate(c) for c in configs]


@router.put("/model")
async def update_model_configs(
    payloads: list[ModelConfigCreate],
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ModelConfigResponse]:
    user_id = current_user.get("sub", "")
    # Simple replace strategy for MVP
    existing_result = await db.execute(select(UserModelConfig).where(UserModelConfig.user_id == user_id))
    for existing in existing_result.scalars().all():
        await db.delete(existing)
    await db.commit()

    created: list[UserModelConfig] = []
    for payload in payloads:
        config = UserModelConfig(
            user_id=user_id,
            provider=payload.provider,
            name=payload.name,
            api_key_encrypted=_encrypt_key(payload.api_key),
            base_url=payload.base_url,
            default_model=payload.default_model,
            is_default=payload.is_default,
            is_enabled=payload.is_enabled,
        )
        db.add(config)
        created.append(config)

    await db.commit()
    for c in created:
        await db.refresh(c)
    return [ModelConfigResponse.model_validate(c) for c in created]
```

- [ ] **Step 7: Commit API routes**

```bash
git add src/speaksum/api/
git commit -m "feat: add FastAPI routers for upload, meetings, speeches, knowledge graph, settings"
```

---

## Chunk 8: Celery Tasks

### Task 8.1: Celery Configuration + Tasks

**Files:**
- Create: `src/speaksum/tasks/celery_app.py`
- Create: `src/speaksum/tasks/celery_tasks.py`

- [ ] **Step 1: Write celery_app.py**

```python
"""Celery application configuration."""

from celery import Celery

from speaksum.core.config import settings

app = Celery("speaksum")
app.conf.broker_url = settings.REDIS_URL
app.conf.result_backend = settings.REDIS_URL
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
app.autodiscover_tasks(["speaksum.tasks"])
```

- [ ] **Step 2: Write celery_tasks.py**

```python
"""Celery tasks for async meeting processing."""

import asyncio
import logging
from datetime import date
from typing import Any

from celery import Task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from speaksum.core.config import settings
from speaksum.core.exceptions import SpeakSumException
from speaksum.models.models import GraphLayout, Meeting, Speech, Topic
from speaksum.schemas.schemas import KnowledgeGraphData
from speaksum.services.file_parser import parse_file
from speaksum.services.knowledge_graph_builder import KnowledgeGraphBuilder
from speaksum.services.llm_client import get_llm_client
from speaksum.services.text_processor import TextProcessor
from speaksum.tasks.celery_app import app

logger = logging.getLogger(__name__)


class SqlAlchemyTask(Task):
    """Celery Task with async DB session support."""

    _async_session_maker: async_sessionmaker | None = None

    @property
    def async_session(self) -> async_sessionmaker:
        if self._async_session_maker is None:
            engine = create_async_engine(settings.DATABASE_URL, future=True)
            self._async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        return self._async_session_maker


@app.task(bind=True, base=SqlAlchemyTask, max_retries=3)
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
    async with self.async_session() as db:
        try:
            await _update_progress(self, meeting_id, "PROCESSING", "parsing", 10)

            text = parse_file(file_path)
            await _update_progress(self, meeting_id, "PROCESSING", "extracting", 25)

            from speaksum.services.file_parser import extract_speeches
            raw_speeches = extract_speeches(text, speaker_identity)
            await _update_progress(self, meeting_id, "PROCESSING", "extracting", 40)

            # Get default model config
            result = await db.execute(
                select(Topic).where(Topic.user_id == "")
            )
            # For MVP, use Kimi default
            llm = get_llm_client("kimi")
            processor = TextProcessor(llm)

            cleaned_speeches: list[Speech] = []
            total = len(raw_speeches) or 1
            for idx, raw in enumerate(raw_speeches):
                processed = await processor.process_speech(raw)
                speech = Speech(
                    meeting_id=meeting_id,
                    timestamp=processed["timestamp"],
                    speaker=processed["speaker"],
                    raw_text=processed["raw_text"],
                    cleaned_text=processed.get("cleaned_text"),
                    key_quotes=processed.get("key_quotes"),
                    topics=processed.get("topics"),
                    sentiment=processed.get("sentiment"),
                    word_count=processed["word_count"],
                )
                cleaned_speeches.append(speech)
                percent = 40 + int((idx + 1) / total * 30)
                await _update_progress(self, meeting_id, "PROCESSING", "cleaning", percent)

            db.add_all(cleaned_speeches)
            await db.commit()

            await _update_progress(self, meeting_id, "PROCESSING", "tagging", 75)

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

            await _update_progress(self, meeting_id, "PROCESSING", "building graph", 90)

            # Build graph layout
            builder = KnowledgeGraphBuilder(db)
            graph = await builder.build_graph(meeting.user_id)
            await builder.save_layout(meeting.user_id, graph)

            # Update meeting status
            meeting.status = "completed"
            await db.commit()

            await _update_progress(self, meeting_id, "SUCCESS", "completed", 100)
            return {"meeting_id": meeting_id, "status": "completed"}

        except Exception as exc:
            logger.exception("process_meeting_task failed")
            meeting_result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
            meeting = meeting_result.scalar_one_or_none()
            if meeting:
                meeting.status = "failed"
                await db.commit()
            await _update_progress(self, meeting_id, "FAILED", "error", 0, error=str(exc))
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
```

- [ ] **Step 3: Commit Celery tasks**

```bash
git add src/speaksum/tasks/
git commit -m "feat: add Celery app and meeting processing task"
```

---

## Chunk 9: FastAPI Main Entry Point

### Task 9.1: main.py

**Files:**
- Create: `src/speaksum/main.py`
- Modify: `src/speaksum/__init__.py` (add app reference if needed)

- [ ] **Step 1: Write main.py**

```python
"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from speaksum.api import (
    knowledge_graph_router,
    meetings_router,
    settings_router,
    speeches_router,
    upload_router,
)
from speaksum.core.config import settings
from speaksum.core.database import async_engine
from speaksum.core.exceptions import SpeakSumException
from speaksum.models.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    # Startup: create tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose engine
    await async_engine.dispose()


app = FastAPI(title="SpeakSum API", version="0.1.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SpeakSumException)
async def speaksum_exception_handler(request, exc: SpeakSumException):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


# Register routers
app.include_router(upload_router)
app.include_router(meetings_router)
app.include_router(speeches_router)
app.include_router(knowledge_graph_router)
app.include_router(settings_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 2: Commit main entry**

```bash
git add src/speaksum/main.py
git commit -m "feat: add FastAPI main entry with CORS, exception handler, and routers"
```

---

## Chunk 10: Tests

### Task 10.1: Test Fixtures

**Files:**
- Create: `tests/conftest.py`
- Delete: `tests/test_placeholder.py`

- [ ] **Step 1: Write conftest.py**

```python
"""pytest fixtures."""

import asyncio
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from speaksum.core.database import get_db
from speaksum.core.security import create_access_token
from speaksum.main import app
from speaksum.models.models import Base, User

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
def authorized_client(test_token) -> TestClient:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        engine = create_async_engine(TEST_DB_URL)
        async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with async_session() as session:
            yield session
        await engine.dispose()

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
```

- [ ] **Step 2: Delete placeholder test**

```bash
rm tests/test_placeholder.py
```

- [ ] **Step 3: Commit conftest**

```bash
git add tests/conftest.py tests/test_placeholder.py
git commit -m "test: add pytest fixtures with async SQLite and auth override"
```

### Task 10.2: Model Tests

**Files:**
- Create: `tests/test_models.py`

- [ ] **Step 4: Write test_models.py**

```python
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
```

- [ ] **Step 5: Commit model tests**

```bash
git add tests/test_models.py
git commit -m "test: add model creation and relationship tests"
```

### Task 10.3: API Tests

**Files:**
- Create: `tests/test_api_upload.py`
- Create: `tests/test_api_meetings.py`

- [ ] **Step 6: Write test_api_upload.py**

```python
"""Tests for upload API."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def mock_celery_task():
    mock = MagicMock()
    mock.id = "task-123"
    with patch("speaksum.api.upload.celery_app.send_task", return_value=mock):
        yield mock


def test_upload_txt(authorized_client: TestClient, mock_celery_task, tmp_path) -> None:
    txt = tmp_path / "meeting.txt"
    txt.write_text("[10:30] 我: hello", encoding="utf-8")

    with open(txt, "rb") as f:
        resp = authorized_client.post(
            "/api/v1/upload?speaker_identity=我",
            files={"file": ("meeting.txt", f, "text/plain")},
        )
    assert resp.status_code == 202
    data = resp.json()
    assert "task_id" in data
    assert "meeting_id" in data


def test_upload_missing_speaker(authorized_client: TestClient) -> None:
    resp = authorized_client.post("/api/v1/upload")
    assert resp.status_code == 400


def test_upload_large_file(authorized_client: TestClient, tmp_path) -> None:
    big = tmp_path / "big.txt"
    big.write_bytes(b"x" * (11 * 1024 * 1024))
    with open(big, "rb") as f:
        resp = authorized_client.post(
            "/api/v1/upload?speaker_identity=我",
            files={"file": ("big.txt", f, "text/plain")},
        )
    assert resp.status_code == 400
```

- [ ] **Step 7: Write test_api_meetings.py**

```python
"""Tests for meetings API."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import Meeting, Speech, User


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
```

- [ ] **Step 8: Commit API tests**

```bash
git add tests/test_api_upload.py tests/test_api_meetings.py
git commit -m "test: add upload and meetings API tests"
```

### Task 10.4: Service Tests

**Files:**
- Create: `tests/test_llm_client.py`
- Create: `tests/test_text_processor.py`

- [ ] **Step 9: Write test_llm_client.py**

```python
"""Tests for LLM client abstraction."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from speaksum.services.llm_client import (
    BaseLLMClient,
    KimiClient,
    OllamaClient,
    get_llm_client,
)


@pytest.mark.asyncio
async def test_kimi_generate() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"
        mock_response = MagicMock()
        mock_response.json = AsyncMock(return_value={
            "choices": [{"message": {"content": "hello"}}]
        })
        mock_response.raise_for_status = MagicMock()
        with patch("httpx.AsyncClient.post", return_value=mock_response):
            client = KimiClient()
            result = await client.generate([{"role": "user", "content": "hi"}])
            assert result == "hello"


def test_get_llm_client_unknown() -> None:
    from speaksum.core.exceptions import SpeakSumException
    with pytest.raises(SpeakSumException):
        get_llm_client("unknown")
```

- [ ] **Step 10: Write test_text_processor.py**

```python
"""Tests for text processor service."""

from unittest.mock import AsyncMock

import pytest

from speaksum.services.text_processor import TextProcessor


@pytest.fixture
def mock_llm():
    return AsyncMock()


@pytest.mark.asyncio
async def test_clean_colloquial(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value=" cleaned ")
    processor = TextProcessor(mock_llm)
    result = await processor.clean_colloquial("呃...")
    assert result == " cleaned "


@pytest.mark.asyncio
async def test_extract_key_quotes(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value='{"quotes": ["q1", "q2"]}')
    processor = TextProcessor(mock_llm)
    result = await processor.extract_key_quotes("test")
    assert result == ["q1", "q2"]


@pytest.mark.asyncio
async def test_analyze_sentiment(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value=" positive ")
    processor = TextProcessor(mock_llm)
    result = await processor.analyze_sentiment("great")
    assert result == "positive"
```

- [ ] **Step 11: Commit service tests**

```bash
git add tests/test_llm_client.py tests/test_text_processor.py
git commit -m "test: add LLM client and text processor service tests"
```

### Task 10.5: Coverage Verification

- [ ] **Step 12: Run full test suite and verify coverage**

Run: `uv run pytest`
Expected: All tests pass with coverage >= 80%.

If coverage is below 80%, add targeted tests for uncovered lines (typically in Celery tasks and knowledge graph builder). Add quick tests to `tests/test_knowledge_graph.py` for builder utilities if needed.

- [ ] **Step 13: Run lint and type check**

Run:
```bash
uv run ruff check .
uv run ruff format .
uv run mypy .
```

Expected: No errors from ruff or mypy --strict.

- [ ] **Step 14: Final commit**

```bash
git add -A
git commit -m "test: verify 80%+ coverage and pass lint/type checks"
```

---

## Final Steps

- [ ] **Push branch**

```bash
git push origin feature/backend-impl
```

- [ ] **Reply to user:** "后端实现完成，请 review"
