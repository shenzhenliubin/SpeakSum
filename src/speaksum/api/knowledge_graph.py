"""Knowledge graph API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Content, Domain, Quote, QuoteDomain
from speaksum.schemas.schemas import (
    ApiResponse,
    GraphDomainDetailResponse,
    GraphDomainQuoteResponse,
    GraphLayoutSaveRequest,
    KnowledgeGraphData,
)
from speaksum.services.domain_graph_builder import DomainGraphBuilder

router = APIRouter(prefix="/api/v1/knowledge-graph", tags=["Knowledge Graph"])


@router.get("")
async def get_knowledge_graph(
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> KnowledgeGraphData:
    user_id = current_user.get("sub", "")
    builder = DomainGraphBuilder(db)
    return await builder.build_graph(user_id)


@router.get("/domains/{domain_id}")
async def get_domain_detail(
    domain_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> GraphDomainDetailResponse:
    user_id = current_user.get("sub", "")
    domain_result = await db.execute(select(Domain).where(Domain.id == domain_id))
    domain = domain_result.scalar_one_or_none()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    quotes_result = await db.execute(
        select(Quote)
        .join(Quote.quote_domains)
        .join(Content)
        .where(Quote.user_id == user_id, Content.user_id == user_id, Quote.quote_domains.any(domain_id=domain_id))
        .options(selectinload(Quote.quote_domains).selectinload(QuoteDomain.domain))
        .order_by(Content.content_date.desc(), Quote.sequence_number, Quote.created_at)
    )
    quotes = quotes_result.scalars().unique().all()

    return GraphDomainDetailResponse(
        domain=domain,
        quotes=[
            GraphDomainQuoteResponse(
                id=quote.id,
                content_id=quote.content_id,
                text=quote.text,
                domain_ids=sorted(
                    [quote_domain.domain_id for quote_domain in quote.quote_domains],
                    key=lambda quote_domain_id: next(
                        (
                            quote_domain.domain.sort_order
                            for quote_domain in quote.quote_domains
                            if quote_domain.domain_id == quote_domain_id and quote_domain.domain is not None
                        ),
                        0,
                    ),
                ),
            )
            for quote in quotes
        ],
        total=len(quotes),
    )


@router.post("/layout")
async def save_graph_layout(
    payload: GraphLayoutSaveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[dict[str, str]]:
    user_id = current_user.get("sub", "")
    graph_data = KnowledgeGraphData(nodes=payload.nodes, edges=payload.edges)
    builder = DomainGraphBuilder(db)
    await builder.save_layout(user_id, graph_data)

    return ApiResponse.success_response({"status": "saved"})
