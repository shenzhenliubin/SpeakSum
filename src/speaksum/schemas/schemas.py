"""Pydantic v2 request and response schemas."""

from datetime import date, datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str | None = None
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
    context_summary: str | None = None
    key_quotes: list[str] | None = None
    ignored_reason: str | None = None
    speech_count: int = 0
    viewpoint_count: int = 0
    created_at: datetime
    updated_at: datetime
    speeches: list["SpeechResponse"] | None = None
    viewpoints: list["ViewpointResponse"] | None = None


class MeetingList(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
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


class ViewpointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    meeting_id: str
    user_id: str
    sequence_number: int
    content: str
    topics: list[str] | None
    confidence: str | None
    created_at: datetime
    updated_at: datetime


class QuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content_id: str
    sequence_number: int
    text: str
    domain_ids: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ContentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    source_type: str
    content_date: date | None
    source_file_name: str | None = None
    source_file_path: str | None = None
    source_file_size: int | None = None
    file_type: str | None = None
    status: str
    ignored_reason: str | None = None
    error_message: str | None = None
    summary_text: str | None = None
    quotes: list[QuoteResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class ContentList(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[ContentResponse]


class ViewpointUpdate(BaseModel):
    content: str | None = None
    topics: list[str] | None = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("content must not be empty")
        return normalized

    @field_validator("topics")
    @classmethod
    def normalize_topics(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        normalized: list[str] = []
        seen: set[str] = set()
        for topic in value:
            item = str(topic).strip()
            if not item or item in seen:
                continue
            seen.add(item)
            normalized.append(item)
        return normalized


class MeetingKeyQuotesUpdate(BaseModel):
    key_quotes: list[str]

    @field_validator("key_quotes")
    @classmethod
    def normalize_quotes(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for quote in value:
            item = str(quote).strip()
            if not item:
                continue
            normalized.append(item)
        return normalized


class MeetingKeyQuotesResponse(BaseModel):
    key_quotes: list[str]


class ContentSummaryUpdate(BaseModel):
    summary_text: str

    @field_validator("summary_text")
    @classmethod
    def validate_summary_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("summary_text must not be empty")
        return normalized


class QuoteUpdate(BaseModel):
    text: str | None = None
    domain_ids: list[str] | None = None

    @field_validator("text")
    @classmethod
    def validate_quote_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("text must not be empty")
        return normalized

    @field_validator("domain_ids")
    @classmethod
    def normalize_domain_ids(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        normalized: list[str] = []
        seen: set[str] = set()
        for domain_id in value:
            item = str(domain_id).strip()
            if not item or item in seen:
                continue
            seen.add(item)
            normalized.append(item)
        if not normalized:
            raise ValueError("domain_ids must contain at least one domain")
        return normalized


class DomainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    description: str | None = None
    is_system_default: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime


class GraphDomainQuoteResponse(BaseModel):
    id: str
    content_id: str
    text: str
    domain_ids: list[str] = Field(default_factory=list)


class GraphDomainDetailResponse(BaseModel):
    domain: DomainResponse
    quotes: list[GraphDomainQuoteResponse] = Field(default_factory=list)
    total: int = 0


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


class TopicDetailResponse(BaseModel):
    topic: TopicResponse
    speeches: list["SpeechResponse"] = Field(default_factory=list)
    viewpoints: list["ViewpointResponse"] = Field(default_factory=list)
    total: int = 0


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
    content_id: str | None = None
    meeting_id: str | None = None
    error_message: str | None = None


class KnowledgeGraphNode(BaseModel):
    id: str
    type: str
    label: str
    x: float = 0.0
    y: float = 0.0
    size: float | None = None
    item_count: int = 0


class KnowledgeGraphEdge(BaseModel):
    source: str
    target: str
    type: str  # contains/related/temporal
    strength: float | None = None


class KnowledgeGraphData(BaseModel):
    nodes: list[KnowledgeGraphNode]
    edges: list[KnowledgeGraphEdge]
    layout_version: str = "1"


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
    has_api_key: bool = False
    base_url: str | None
    default_model: str
    is_default: bool
    is_enabled: bool
    encryption_version: int
    created_at: datetime
    updated_at: datetime


class ModelConfigTestRequest(BaseModel):
    config_id: str | None = None
    provider: str = Field(..., min_length=1, max_length=50)
    api_key: str | None = Field(None, max_length=500)
    base_url: str | None = Field(None, max_length=500)
    default_model: str = Field(..., min_length=1, max_length=100)


class ModelConfigTestResponse(BaseModel):
    success: bool
    message: str
    provider: str
    model: str


class SpeakerIdentityCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    aliases: list[str] = Field(default_factory=list)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    avatar_url: str | None = Field(None, max_length=500)
    is_default: bool = False


class SpeakerIdentityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    display_name: str
    aliases: list[str] | None
    color: str | None
    avatar_url: str | None
    is_default: bool
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
