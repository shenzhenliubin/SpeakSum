"""Content summary and quote APIs."""

import math
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Content, Domain, Quote, QuoteDomain
from speaksum.schemas.schemas import (
    ContentList,
    ContentResponse,
    ContentSummaryUpdate,
    QuoteResponse,
    QuoteUpdate,
)
from speaksum.services.domain_graph_builder import DomainGraphBuilder

router = APIRouter(prefix="/api/v1/contents", tags=["Contents"])


def _serialize_quote(quote: Quote) -> QuoteResponse:
    domain_ids = sorted(
        [quote_domain.domain_id for quote_domain in quote.quote_domains],
        key=lambda domain_id: next(
            (
                quote_domain.domain.sort_order
                for quote_domain in quote.quote_domains
                if quote_domain.domain_id == domain_id and quote_domain.domain is not None
            ),
            0,
        ),
    )
    return QuoteResponse(
        id=quote.id,
        content_id=quote.content_id,
        sequence_number=quote.sequence_number,
        text=quote.text,
        domain_ids=domain_ids,
        created_at=quote.created_at,
        updated_at=quote.updated_at,
    )


def _serialize_content(content: Content) -> ContentResponse:
    sorted_quotes = sorted(content.quotes, key=lambda quote: (quote.sequence_number, quote.created_at))
    return ContentResponse(
        id=content.id,
        user_id=content.user_id,
        title=content.title,
        source_type=content.source_type,
        content_date=content.content_date,
        source_file_name=content.source_file_name,
        source_file_path=content.source_file_path,
        source_file_size=content.source_file_size,
        file_type=content.file_type,
        status=content.status,
        ignored_reason=content.ignored_reason,
        error_message=content.error_message,
        summary_text=content.summary_text,
        quotes=[_serialize_quote(quote) for quote in sorted_quotes],
        created_at=content.created_at,
        updated_at=content.updated_at,
        completed_at=content.completed_at,
    )


async def _get_content_for_user(db: AsyncSession, content_id: str, user_id: str) -> Content | None:
    result = await db.execute(
        select(Content)
        .where(Content.id == content_id, Content.user_id == user_id)
        .options(
            selectinload(Content.quotes)
            .selectinload(Quote.quote_domains)
            .selectinload(QuoteDomain.domain)
        )
    )
    return result.scalar_one_or_none()


async def _get_quote_for_content(
    db: AsyncSession,
    content_id: str,
    quote_id: str,
    user_id: str,
) -> Quote | None:
    result = await db.execute(
        select(Quote)
        .join(Content)
        .where(
            Quote.id == quote_id,
            Quote.content_id == content_id,
            Quote.user_id == user_id,
            Content.user_id == user_id,
        )
        .execution_options(populate_existing=True)
        .options(selectinload(Quote.quote_domains).selectinload(QuoteDomain.domain))
    )
    return result.scalar_one_or_none()


@router.get("")
async def list_contents(
    q: str | None = Query(None, description="Search query"),
    status: str | None = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ContentList:
    user_id = current_user.get("sub", "")
    base_stmt = select(Content).where(Content.user_id == user_id)
    count_stmt = select(func.count(Content.id)).where(Content.user_id == user_id)

    if not status:
        base_stmt = base_stmt.where(Content.status != "ignored")
        count_stmt = count_stmt.where(Content.status != "ignored")

    if q:
        pattern = f"%{q}%"
        base_stmt = base_stmt.where(Content.title.ilike(pattern))
        count_stmt = count_stmt.where(Content.title.ilike(pattern))

    if status:
        base_stmt = base_stmt.where(Content.status == status)
        count_stmt = count_stmt.where(Content.status == status)

    base_stmt = (
        base_stmt.options(
            selectinload(Content.quotes)
            .selectinload(Quote.quote_domains)
            .selectinload(QuoteDomain.domain)
        )
        .order_by(
            Content.content_date.is_(None),
            Content.content_date.desc(),
            Content.created_at.desc(),
        )
    )

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(base_stmt.offset(offset).limit(page_size))
    contents = result.scalars().all()

    total_pages = math.ceil(total / page_size) if page_size else 1
    return ContentList(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=[_serialize_content(content) for content in contents],
    )


@router.get("/{content_id}")
async def get_content(
    content_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ContentResponse:
    user_id = current_user.get("sub", "")
    content = await _get_content_for_user(db, content_id, user_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    return _serialize_content(content)


@router.patch("/{content_id}/summary", response_model=ContentResponse)
async def update_content_summary(
    content_id: str,
    payload: ContentSummaryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ContentResponse:
    user_id = current_user.get("sub", "")
    content = await _get_content_for_user(db, content_id, user_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.summary_text = payload.summary_text
    await db.commit()

    refreshed = await _get_content_for_user(db, content_id, user_id)
    if refreshed is None:
        raise HTTPException(status_code=404, detail="Content not found")
    return _serialize_content(refreshed)


@router.patch("/{content_id}/quotes/{quote_id}", response_model=QuoteResponse)
async def update_content_quote(
    content_id: str,
    quote_id: str,
    payload: QuoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> QuoteResponse:
    user_id = current_user.get("sub", "")
    quote = await _get_quote_for_content(db, content_id, quote_id, user_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    domains_changed = False

    if payload.text is not None:
        quote.text = payload.text

    if payload.domain_ids is not None:
        domain_ids = payload.domain_ids
        if domain_ids:
            result = await db.execute(select(Domain.id).where(Domain.id.in_(domain_ids)))
            existing_domain_ids = {domain_id for (domain_id,) in result.all()}
            missing = [domain_id for domain_id in domain_ids if domain_id not in existing_domain_ids]
            if missing:
                raise HTTPException(status_code=400, detail=f"Unknown domain_ids: {', '.join(missing)}")

        await db.execute(delete(QuoteDomain).where(QuoteDomain.quote_id == quote.id))
        await db.flush()
        for domain_id in domain_ids:
            db.add(QuoteDomain(quote_id=quote.id, domain_id=domain_id))
        domains_changed = True

    await db.commit()
    db.expire(quote, ["quote_domains"])

    if domains_changed:
        builder = DomainGraphBuilder(db)
        await builder.refresh_graph_for_user(user_id)

    refreshed = await _get_quote_for_content(db, content_id, quote_id, user_id)
    if refreshed is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    return _serialize_quote(refreshed)


@router.delete("/{content_id}/quotes/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content_quote(
    content_id: str,
    quote_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    user_id = current_user.get("sub", "")
    quote = await _get_quote_for_content(db, content_id, quote_id, user_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    await db.delete(quote)
    await db.commit()

    builder = DomainGraphBuilder(db)
    await builder.refresh_graph_for_user(user_id)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    user_id = current_user.get("sub", "")
    content = await _get_content_for_user(db, content_id, user_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    await db.delete(content)
    await db.commit()

    builder = DomainGraphBuilder(db)
    await builder.refresh_graph_for_user(user_id)
