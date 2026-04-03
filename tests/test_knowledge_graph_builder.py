"""Tests for knowledge graph builder service."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.services.knowledge_graph_builder import KnowledgeGraphBuilder, _cosine_similarity


@pytest.fixture
def mock_db_session():
    return MagicMock(spec=AsyncSession)


def test_cosine_similarity() -> None:
    """Test cosine similarity calculation."""
    # Same vectors should have similarity 1
    a = [1.0, 0.0, 0.0]
    b = [1.0, 0.0, 0.0]
    assert _cosine_similarity(a, b) == 1.0

    # Orthogonal vectors should have similarity 0
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    assert _cosine_similarity(a, b) == 0.0

    # Empty vectors should return 0
    assert _cosine_similarity([], [1.0]) == 0.0
    assert _cosine_similarity([1.0], []) == 0.0

    # Different length vectors should return 0
    assert _cosine_similarity([1.0, 0.0], [1.0]) == 0.0


@pytest.mark.asyncio
async def test_build_graph_empty(mock_db_session) -> None:
    """Test building graph with no data."""
    builder = KnowledgeGraphBuilder(mock_db_session)

    # Mock empty results
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    graph = await builder.build_graph("user-123")

    assert hasattr(graph, 'nodes')
    assert hasattr(graph, 'edges')
    assert len(graph.nodes) == 0
    assert len(graph.edges) == 0


@pytest.mark.asyncio
async def test_get_topic_speeches(mock_db_session) -> None:
    """Test getting speeches for a topic."""
    builder = KnowledgeGraphBuilder(mock_db_session)

    # Mock speech data
    mock_speech = MagicMock()
    mock_speech.id = "speech-1"
    mock_speech.raw_text = "test speech"
    mock_speech.topics = ["产品策略"]

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_speech]
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    speeches = await builder._get_topic_speeches("产品策略", "user-123")

    assert len(speeches) == 1
    assert speeches[0].id == "speech-1"


@pytest.mark.asyncio
async def test_get_topic_meetings(mock_db_session) -> None:
    """Test getting meetings for a topic."""
    builder = KnowledgeGraphBuilder(mock_db_session)

    # Mock meeting data
    mock_meeting = MagicMock()
    mock_meeting.id = "meeting-1"
    mock_meeting.title = "Test Meeting"

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_meeting]
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    meetings = await builder._get_topic_meetings("产品策略", "user-123")

    assert len(meetings) == 1
    assert meetings[0].id == "meeting-1"


def test_cosine_similarity_zero_norm() -> None:
    """Test cosine similarity with zero norm vectors."""
    # Zero vectors should return 0
    assert _cosine_similarity([0.0, 0.0], [1.0, 0.0]) == 0.0
    assert _cosine_similarity([1.0, 0.0], [0.0, 0.0]) == 0.0
    assert _cosine_similarity([0.0, 0.0], [0.0, 0.0]) == 0.0


def test_cosine_similarity_different_lengths() -> None:
    """Test cosine similarity with different length vectors."""
    assert _cosine_similarity([1.0, 0.0, 0.0], [1.0, 0.0]) == 0.0


@pytest.mark.asyncio
async def test_compute_topic_relations(mock_db_session) -> None:
    """Test computing topic relations with co-occurrence."""
    builder = KnowledgeGraphBuilder(mock_db_session)

    # Mock topics
    mock_topic_a = MagicMock()
    mock_topic_a.id = "topic-a"
    mock_topic_a.name = "产品策略"
    mock_topic_a.embedding = [1.0, 0.0, 0.0]

    mock_topic_b = MagicMock()
    mock_topic_b.id = "topic-b"
    mock_topic_b.name = "成本管理"
    mock_topic_b.embedding = [0.0, 1.0, 0.0]

    # Mock topic query result
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_topic_a, mock_topic_b]

    # Mock relation query (no existing relation)
    mock_rel_result = MagicMock()
    mock_rel_result.scalar_one_or_none.return_value = None

    # Track calls to execute
    call_count = 0
    async def mock_execute(stmt):
        nonlocal call_count
        call_count += 1
        # First call is for topics, subsequent calls for relations
        if call_count == 1:
            return mock_result
        return mock_rel_result

    mock_db_session.execute = mock_execute
    mock_db_session.commit = AsyncMock()

    # Run compute_topic_relations
    await builder.compute_topic_relations("user-123")

    # Verify commit was called
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_save_layout_create_new(mock_db_session) -> None:
    """Test save_layout when no layout exists (creates new)."""
    builder = KnowledgeGraphBuilder(mock_db_session)

    # Mock no existing layout
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    from speaksum.schemas.schemas import KnowledgeGraphData, KnowledgeGraphNode

    data = KnowledgeGraphData(
        nodes=[KnowledgeGraphNode(id="topic1", type="topic", label="Test", x=0, y=0)],
        edges=[]
    )

    await builder.save_layout("user-123", data)

    # Verify add was called for new layout
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()


@pytest.mark.asyncio
async def test_save_layout_update_existing(mock_db_session) -> None:
    """Test save_layout when layout exists (updates existing)."""
    builder = KnowledgeGraphBuilder(mock_db_session)

    # Mock existing layout
    mock_layout = MagicMock()
    mock_layout.version = 1

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_layout
    mock_db_session.execute = AsyncMock(return_value=mock_result)

    from speaksum.schemas.schemas import KnowledgeGraphData, KnowledgeGraphNode

    data = KnowledgeGraphData(
        nodes=[KnowledgeGraphNode(id="topic1", type="topic", label="Test", x=0, y=0)],
        edges=[]
    )

    await builder.save_layout("user-123", data)

    # Verify layout was updated
    assert mock_layout.version == 2
    mock_db_session.commit.assert_called_once()
