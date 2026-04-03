"""Knowledge graph builder: topic clustering, relations, layout data."""

import math
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.models.models import GraphLayout, Meeting, Speech, Topic, TopicRelation
from speaksum.schemas.schemas import KnowledgeGraphData, KnowledgeGraphEdge, KnowledgeGraphNode


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class KnowledgeGraphBuilder:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def build_graph(self, user_id: str) -> KnowledgeGraphData:
        topics_result = await self.db.execute(
            select(Topic).where(Topic.user_id == user_id).order_by(Topic.created_at)
        )
        topics = list(topics_result.scalars().all())

        speeches_result = await self.db.execute(
            select(Speech)
            .join(Meeting)
            .where(Meeting.user_id == user_id)
            .order_by(Speech.created_at)
        )
        speeches = list(speeches_result.scalars().all())

        nodes: list[KnowledgeGraphNode] = []
        edges: list[KnowledgeGraphEdge] = []

        # Topic nodes
        topic_positions: dict[str, tuple[float, float]] = {}
        angle_step = 2 * math.pi / max(len(topics), 1)
        radius = 200.0
        for idx, topic in enumerate(topics):
            angle = idx * angle_step
            x = radius * math.cos(angle)
            y = radius * math.sin(angle)
            topic_positions[topic.id] = (x, y)
            size = math.sqrt(max(topic.speech_count, 1)) * 15
            nodes.append(
                KnowledgeGraphNode(
                    id=topic.id,
                    type="topic",
                    label=topic.name,
                    x=x,
                    y=y,
                    size=size,
                )
            )

        # Speech nodes inside topic islands
        speech_positions: dict[str, tuple[float, float]] = {}
        topic_speech_count: dict[str, int] = {}
        for speech in speeches:
            for topic_name in speech.topics or []:
                matched_topic = next((t for t in topics if t.name == topic_name), None)
                if not matched_topic:
                    continue
                topic_speech_count[matched_topic.id] = topic_speech_count.get(matched_topic.id, 0) + 1
                tx, ty = topic_positions[matched_topic.id]
                offset = topic_speech_count[matched_topic.id] * 30
                sx = tx + 20
                sy = ty + offset
                speech_positions[speech.id] = (sx, sy)
                nodes.append(
                    KnowledgeGraphNode(
                        id=speech.id,
                        type="speech",
                        label=(speech.cleaned_text or speech.raw_text)[:20] + "...",
                        x=sx,
                        y=sy,
                        size=6,
                    )
                )
                edges.append(
                    KnowledgeGraphEdge(
                        source=matched_topic.id,
                        target=speech.id,
                        type="contains",
                    )
                )

        # Topic relations
        rel_result = await self.db.execute(
            select(TopicRelation)
            .join(Topic, TopicRelation.topic_a_id == Topic.id)
            .where(Topic.user_id == user_id)
            .where(TopicRelation.total_score >= 0.2)
        )
        for rel in rel_result.scalars().all():
            edges.append(
                KnowledgeGraphEdge(
                    source=rel.topic_a_id,
                    target=rel.topic_b_id,
                    type="related",
                    strength=rel.total_score,
                )
            )

        return KnowledgeGraphData(nodes=nodes, edges=edges)

    async def compute_topic_relations(self, user_id: str) -> None:
        result = await self.db.execute(select(Topic).where(Topic.user_id == user_id))
        topics = list(result.scalars().all())

        for i, topic_a in enumerate(topics):
            for topic_b in topics[i + 1 :]:
                # Co-occurrence
                meetings_a: set[str] = set()
                meetings_b: set[str] = set()
                for speech in await self._get_topic_speeches(topic_a.name, user_id):
                    meetings_a.add(speech.meeting_id)
                for speech in await self._get_topic_speeches(topic_b.name, user_id):
                    meetings_b.add(speech.meeting_id)
                co_occurrence = len(meetings_a & meetings_b)
                total_meetings = len(meetings_a | meetings_b) or 1
                co_score = co_occurrence / total_meetings

                # Temporal
                dates_a = [
                    m.meeting_date
                    for m in await self._get_topic_meetings(topic_a.name, user_id)
                    if m.meeting_date
                ]
                dates_b = [
                    m.meeting_date
                    for m in await self._get_topic_meetings(topic_b.name, user_id)
                    if m.meeting_date
                ]
                temporal_score = 0.0
                if dates_a and dates_b:
                    min_diff = min(abs((a - b).days) for a in dates_a for b in dates_b)
                    temporal_score = 1.0 / (min_diff + 1)

                # Semantic
                emb_a = topic_a.embedding or []
                emb_b = topic_b.embedding or []
                semantic_score = _cosine_similarity(emb_a, emb_b)

                total = 0.4 * co_score + 0.2 * temporal_score + 0.4 * semantic_score

                existing = await self.db.execute(
                    select(TopicRelation).where(
                        ((TopicRelation.topic_a_id == topic_a.id) & (TopicRelation.topic_b_id == topic_b.id))
                        | ((TopicRelation.topic_a_id == topic_b.id) & (TopicRelation.topic_b_id == topic_a.id))
                    )
                )
                rel = existing.scalar_one_or_none()
                if rel:
                    rel.co_occurrence_score = co_score
                    rel.temporal_score = temporal_score
                    rel.semantic_score = semantic_score
                    rel.total_score = total
                else:
                    self.db.add(
                        TopicRelation(
                            topic_a_id=topic_a.id,
                            topic_b_id=topic_b.id,
                            co_occurrence_score=co_score,
                            temporal_score=temporal_score,
                            semantic_score=semantic_score,
                            total_score=total,
                        )
                    )
        await self.db.commit()

    async def _get_topic_speeches(self, topic_name: str, user_id: str) -> list[Speech]:
        result = await self.db.execute(
            select(Speech)
            .join(Meeting)
            .where(Meeting.user_id == user_id)
            .where(Speech.topics.contains([topic_name]))
        )
        return list(result.scalars().all())

    async def _get_topic_meetings(self, topic_name: str, user_id: str) -> list[Meeting]:
        result = await self.db.execute(
            select(Meeting)
            .join(Speech)
            .where(Meeting.user_id == user_id)
            .where(Speech.topics.contains([topic_name]))
            .distinct()
        )
        return list(result.scalars().all())

    async def save_layout(self, user_id: str, data: KnowledgeGraphData) -> None:
        result = await self.db.execute(select(GraphLayout).where(GraphLayout.user_id == user_id))
        layout = result.scalar_one_or_none()
        layout_dict: dict[str, Any] = {
            "nodes": [n.model_dump() for n in data.nodes],
            "edges": [e.model_dump() for e in data.edges],
        }
        if layout:
            layout.layout_data = layout_dict
            layout.version += 1
        else:
            self.db.add(GraphLayout(user_id=user_id, layout_data=layout_dict, version=1))
        await self.db.commit()
