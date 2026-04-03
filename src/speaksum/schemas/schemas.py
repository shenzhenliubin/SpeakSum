"""Pydantic v2 request and response schemas."""

from datetime import date, datetime
from typing import Any, Generic, TypeVar

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
    duration_minutes: int | None
    participants: list[str] | None
    source_file: str
    file_size: int
    status: str
    error_message: str | None = None
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
    sequence_number: int
    timestamp: str | None
    speaker: str
    is_target_speaker: bool
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
    """Processing task status with detailed state machine.

    Status values:
    - PENDING: Task queued, waiting for worker (0%)
    - PARSING: Parsing file, extracting raw text (10%)
    - EXTRACTING: Extracting speeches by speaker (25-40%)
    - CLEANING: Cleaning colloquial expressions via LLM (40-70%)
    - TAGGING: Extracting topics and sentiment (75%)
    - BUILDING_GRAPH: Building knowledge graph (90%)
    - SUCCESS: Processing complete (100%)
    - FAILED: Processing failed
    """
    task_id: str
    status: str  # PENDING/PARSING/EXTRACTING/CLEANING/TAGGING/BUILDING_GRAPH/SUCCESS/FAILED
    stage: str | None = None
    percent: int = Field(0, ge=0, le=100)
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
    encryption_version: int
    created_at: datetime
    updated_at: datetime


class SpeakerIdentityCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    aliases: list[str] = Field(default_factory=list)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    avatar_url: str | None = Field(None, max_length=500)


class SpeakerIdentityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    display_name: str
    aliases: list[str] | None
    color: str | None
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime


class GraphLayoutSaveRequest(BaseModel):
    """Request to save graph layout."""
    nodes: list[KnowledgeGraphNode]
    edges: list[KnowledgeGraphEdge]
    viewport: dict[str, float] | None = None


T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ApiResponse(BaseModel, Generic[T]):
    """Unified API response envelope."""
    success: bool
    data: T | None = None
    meta: dict[str, Any] | None = None
    error: ErrorDetail | None = None

    @classmethod
    def success_response(cls, data: T, meta: dict[str, Any] | None = None) -> "ApiResponse[T]":
        return cls(success=True, data=data, meta=meta, error=None)

    @classmethod
    def error_response(cls, code: str, message: str, details: dict[str, Any] | None = None) -> "ApiResponse[Any]":
        return cls(success=False, data=None, meta=None, error=ErrorDetail(code=code, message=message, details=details))
