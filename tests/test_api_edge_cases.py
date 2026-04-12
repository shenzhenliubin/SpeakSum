"""Edge-case coverage for the content-first API surface."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import Content


def test_list_contents_empty(authorized_client: TestClient) -> None:
    resp = authorized_client.get("/api/v1/contents")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "items" in data


@pytest.mark.asyncio
async def test_list_contents_with_pagination(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="产品专题会",
        source_type="meeting_minutes",
        content_date=date(2026, 4, 6),
        status="completed",
        summary_text="这是一段摘要。",
    )
    db_session.add(content)
    await db_session.commit()

    resp = authorized_client.get("/api/v1/contents?page=1&page_size=5")
    assert resp.status_code == 200
    assert len(resp.json()["items"]) <= 5


@pytest.mark.asyncio
async def test_search_contents_special_chars(
    authorized_client: TestClient,
    db_session: AsyncSession,
    test_user,
) -> None:
    content = Content(
        user_id=test_user.id,
        title="产品&技术复盘",
        source_type="other_text",
        content_date=date(2026, 4, 6),
        status="completed",
        summary_text="这是一段摘要。",
    )
    db_session.add(content)
    await db_session.commit()

    resp = authorized_client.get("/api/v1/contents?q=%E4%BA%A7%E5%93%81")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
