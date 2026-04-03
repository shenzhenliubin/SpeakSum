"""Knowledge graph API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting, Speech, Topic
from speaksum.schemas.schemas import GraphLayoutSaveRequest, KnowledgeGraphData, SpeechResponse
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
        .distinct()
    )
    speeches = result.scalars().all()
    return [SpeechResponse.model_validate(s) for s in speeches]


@router.post("/layout")
async def save_graph_layout(
    payload: GraphLayoutSaveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """Save user-adjusted graph layout."""
    user_id = current_user.get("sub", "")

    # Convert payload to KnowledgeGraphData for the builder
    graph_data = KnowledgeGraphData(nodes=payload.nodes, edges=payload.edges)

    # Save layout using the builder
    builder = KnowledgeGraphBuilder(db)
    await builder.save_layout(user_id, graph_data)

    return {"status": "saved"}
