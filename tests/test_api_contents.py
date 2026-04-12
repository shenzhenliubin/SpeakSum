"""Tests for content summary APIs."""

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import Content, Domain, Quote, QuoteDomain, User


@pytest.mark.asyncio
async def test_get_content_detail_returns_summary_and_quotes(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="数字化专题会",
        source_type="other_text",
        content_date=date(2026, 4, 6),
        source_file_name="notes.txt",
        file_type="txt",
        status="completed",
        summary_text="刘彬在这份文本中强调，先明确边界，再决定资源投入节奏。",
    )
    domain = Domain(
        id="decision_method",
        display_name="方法论与决策",
        sort_order=1,
    )
    db_session.add_all([content, domain])
    await db_session.commit()
    await db_session.refresh(content)

    quote = Quote(
        content_id=content.id,
        user_id=test_user.id,
        sequence_number=1,
        text="先明确边界，再决定资源投入。",
    )
    db_session.add(quote)
    await db_session.commit()
    await db_session.refresh(quote)

    db_session.add(QuoteDomain(quote_id=quote.id, domain_id=domain.id))
    await db_session.commit()

    resp = authorized_client.get(f"/api/v1/contents/{content.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source_type"] == "other_text"
    assert data["summary_text"] == "刘彬在这份文本中强调，先明确边界，再决定资源投入节奏。"
    assert len(data["quotes"]) == 1
    assert data["quotes"][0]["text"] == "先明确边界，再决定资源投入。"
    assert data["quotes"][0]["domain_ids"] == ["decision_method"]


@pytest.mark.asyncio
async def test_list_contents_orders_by_content_date_desc_with_nulls_last(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    older = Content(
        user_id=test_user.id,
        title="较早内容",
        source_type="other_text",
        content_date=date(2025, 1, 1),
        status="completed",
    )
    newer = Content(
        user_id=test_user.id,
        title="较晚内容",
        source_type="meeting_minutes",
        content_date=date(2026, 4, 6),
        status="completed",
    )
    missing = Content(
        user_id=test_user.id,
        title="无日期内容",
        source_type="other_text",
        status="completed",
    )
    db_session.add_all([older, newer, missing])
    await db_session.commit()

    resp = authorized_client.get("/api/v1/contents")
    assert resp.status_code == 200
    data = resp.json()
    titles = [item["title"] for item in data["items"]]
    assert titles.index("较晚内容") < titles.index("较早内容") < titles.index("无日期内容")


@pytest.mark.asyncio
async def test_update_content_summary(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="技术随笔",
        source_type="other_text",
        status="completed",
        summary_text="旧总结",
    )
    db_session.add(content)
    await db_session.commit()
    await db_session.refresh(content)

    resp = authorized_client.patch(
        f"/api/v1/contents/{content.id}/summary",
        json={"summary_text": "新总结"},
    )
    assert resp.status_code == 200
    assert resp.json()["summary_text"] == "新总结"


@pytest.mark.asyncio
async def test_update_quote_domains_refreshes_graph(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="技术随笔",
        source_type="other_text",
        status="completed",
    )
    db_session.add_all(
        [
            content,
            Domain(id="decision_method", display_name="方法论与决策", sort_order=1),
            Domain(id="technology_architecture", display_name="技术与架构", sort_order=2),
        ]
    )
    await db_session.commit()
    await db_session.refresh(content)

    quote = Quote(
        content_id=content.id,
        user_id=test_user.id,
        sequence_number=1,
        text="旧金句",
    )
    db_session.add(quote)
    await db_session.commit()
    await db_session.refresh(quote)
    db_session.add(QuoteDomain(quote_id=quote.id, domain_id="decision_method"))
    await db_session.commit()

    with patch("speaksum.api.contents.DomainGraphBuilder") as MockBuilder:
        builder = MagicMock()
        builder.refresh_graph_for_user = AsyncMock()
        MockBuilder.return_value = builder

        resp = authorized_client.patch(
            f"/api/v1/contents/{content.id}/quotes/{quote.id}",
            json={
                "text": "新金句",
                "domain_ids": ["technology_architecture"],
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["text"] == "新金句"
    assert data["domain_ids"] == ["technology_architecture"]
    builder.refresh_graph_for_user.assert_awaited_once_with(test_user.id)


@pytest.mark.asyncio
async def test_update_quote_domains_rejects_empty_domain_list(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="技术随笔",
        source_type="other_text",
        status="completed",
    )
    db_session.add_all([content, Domain(id="decision_method", display_name="方法论与决策", sort_order=1)])
    await db_session.commit()
    await db_session.refresh(content)

    quote = Quote(
        content_id=content.id,
        user_id=test_user.id,
        sequence_number=1,
        text="旧金句",
    )
    db_session.add(quote)
    await db_session.commit()
    await db_session.refresh(quote)
    db_session.add(QuoteDomain(quote_id=quote.id, domain_id="decision_method"))
    await db_session.commit()

    resp = authorized_client.patch(
        f"/api/v1/contents/{content.id}/quotes/{quote.id}",
        json={"domain_ids": []},
    )

    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert any("domain_ids" in str(item) for item in detail)


@pytest.mark.asyncio
async def test_delete_quote_refreshes_graph(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user: User,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="技术随笔",
        source_type="other_text",
        status="completed",
    )
    db_session.add_all([content, Domain(id="decision_method", display_name="方法论与决策", sort_order=1)])
    await db_session.commit()
    await db_session.refresh(content)

    quote = Quote(
        content_id=content.id,
        user_id=test_user.id,
        sequence_number=1,
        text="待删除金句",
    )
    db_session.add(quote)
    await db_session.commit()
    await db_session.refresh(quote)
    db_session.add(QuoteDomain(quote_id=quote.id, domain_id="decision_method"))
    await db_session.commit()

    with patch("speaksum.api.contents.DomainGraphBuilder") as MockBuilder:
        builder = MagicMock()
        builder.refresh_graph_for_user = AsyncMock()
        MockBuilder.return_value = builder

        resp = authorized_client.delete(f"/api/v1/contents/{content.id}/quotes/{quote.id}")

    assert resp.status_code == 204
    builder.refresh_graph_for_user.assert_awaited_once_with(test_user.id)
