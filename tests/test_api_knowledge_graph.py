"""Tests for knowledge graph API."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import User



def test_get_knowledge_graph(authorized_client: TestClient) -> None:
    """Test getting knowledge graph data."""
    # Mock the knowledge graph builder
    mock_graph_data = {
        "nodes": [{"id": "topic1", "type": "topic", "label": "产品策略", "x": 0, "y": 0}],
        "edges": [{"source": "topic1", "target": "speech1", "type": "contains"}]
    }

    with patch("speaksum.api.knowledge_graph.KnowledgeGraphBuilder") as MockBuilder:
        mock_instance = MagicMock()
        mock_instance.build_graph = AsyncMock(return_value=mock_graph_data)
        MockBuilder.return_value = mock_instance

        resp = authorized_client.get("/api/v1/knowledge-graph")
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data


def test_get_topic_speeches_not_found(authorized_client: TestClient) -> None:
    """Test getting speeches for non-existent topic."""
    resp = authorized_client.get("/api/v1/knowledge-graph/topics/nonexistent-id/speeches")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_topic_speeches_empty(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User
) -> None:
    """Test getting speeches for topic with no speeches."""
    from speaksum.models.models import Topic

    # Create a topic for the user
    topic = Topic(
        user_id=test_user.id,
        name="Empty Topic",
        speech_count=0
    )
    db_session.add(topic)
    await db_session.commit()
    await db_session.refresh(topic)

    # Get speeches for topic (should return empty list)
    resp = authorized_client.get(f"/api/v1/knowledge-graph/topics/{topic.id}/speeches")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 0


@pytest.mark.asyncio
async def test_access_another_user_topic(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User
) -> None:
    """Test accessing another user's topic should return 404."""
    from speaksum.models.models import Topic

    # Create another user
    other_user = User(id="other-user-999", email="other3@example.com", password_hash="hashed")
    db_session.add(other_user)
    await db_session.commit()

    # Create topic for other user
    other_topic = Topic(
        user_id=other_user.id,
        name="Other Topic",
        speech_count=0
    )
    db_session.add(other_topic)
    await db_session.commit()
    await db_session.refresh(other_topic)

    # Try to access other user's topic speeches
    resp = authorized_client.get(f"/api/v1/knowledge-graph/topics/{other_topic.id}/speeches")
    assert resp.status_code == 404
