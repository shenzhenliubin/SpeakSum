"""Tests for the domain-based knowledge graph API."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import Content, Domain, Quote, QuoteDomain, User


def test_get_knowledge_graph(authorized_client: TestClient) -> None:
    mock_graph_data = {
        "nodes": [
            {
                "id": "decision_method",
                "type": "domain",
                "label": "方法论与决策",
                "x": 0,
                "y": 0,
                "item_count": 3,
            }
        ],
        "edges": [],
        "layout_version": "2",
    }

    with patch("speaksum.api.knowledge_graph.DomainGraphBuilder") as MockBuilder:
        mock_instance = MagicMock()
        mock_instance.build_graph = AsyncMock(return_value=mock_graph_data)
        MockBuilder.return_value = mock_instance

        resp = authorized_client.get("/api/v1/knowledge-graph")
        assert resp.status_code == 200
        data = resp.json()
        assert data["nodes"][0]["type"] == "domain"
        assert data["layout_version"] == "2"


@pytest.mark.asyncio
async def test_get_knowledge_graph_returns_domain_nodes(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="数字化专题会",
        source_type="other_text",
        status="completed",
        content_date=date(2026, 4, 5),
    )
    domain = Domain(
        id="technology_architecture",
        display_name="技术与架构",
        sort_order=1,
    )
    db_session.add_all([content, domain])
    await db_session.commit()
    await db_session.refresh(content)

    quote = Quote(
        content_id=content.id,
        user_id=test_user.id,
        sequence_number=1,
        text="平台化建设要先定义边界。",
    )
    db_session.add(quote)
    await db_session.commit()
    await db_session.refresh(quote)
    db_session.add(QuoteDomain(quote_id=quote.id, domain_id=domain.id))
    await db_session.commit()

    resp = authorized_client.get("/api/v1/knowledge-graph")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["nodes"]) == 1
    assert data["nodes"][0]["type"] == "domain"
    assert data["nodes"][0]["label"] == "技术与架构"
    assert data["nodes"][0]["item_count"] == 1


@pytest.mark.asyncio
async def test_get_domain_detail_returns_quotes(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    domain = Domain(
        id="technology_architecture",
        display_name="技术与架构",
        sort_order=2,
    )
    content = Content(
        user_id=test_user.id,
        title="技术规划随笔",
        source_type="other_text",
        content_date=date(2026, 4, 6),
        status="completed",
        summary_text="刘彬在文本中强调平台边界与演进节奏。",
    )
    db_session.add_all([domain, content])
    await db_session.commit()
    await db_session.refresh(content)

    quote = Quote(
        content_id=content.id,
        user_id=test_user.id,
        sequence_number=1,
        text="平台化的前提是先定义边界。",
    )
    db_session.add(quote)
    await db_session.commit()
    await db_session.refresh(quote)
    db_session.add(QuoteDomain(quote_id=quote.id, domain_id=domain.id))
    await db_session.commit()

    resp = authorized_client.get(f"/api/v1/knowledge-graph/domains/{domain.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["domain"]["id"] == "technology_architecture"
    assert data["quotes"][0]["text"] == "平台化的前提是先定义边界。"
    assert data["quotes"][0]["content_id"] == content.id
    assert data["quotes"][0]["domain_ids"] == ["technology_architecture"]


def test_get_domain_detail_not_found(authorized_client: TestClient) -> None:
    resp = authorized_client.get("/api/v1/knowledge-graph/domains/nonexistent-domain")
    assert resp.status_code == 404
