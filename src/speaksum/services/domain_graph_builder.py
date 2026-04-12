"""Domain-centric knowledge graph builder."""

import math
from collections import Counter, defaultdict
from itertools import combinations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.schema import DEFAULT_DOMAINS
from speaksum.models.models import Content, Domain, DomainRelation, GraphLayout, Quote, QuoteDomain
from speaksum.schemas.schemas import KnowledgeGraphData, KnowledgeGraphEdge, KnowledgeGraphNode


async def ensure_default_domains(db: AsyncSession) -> None:
    existing_result = await db.execute(select(Domain.id))
    existing_ids = {domain_id for (domain_id,) in existing_result.all()}

    for sort_order, (domain_id, display_name) in enumerate(DEFAULT_DOMAINS, start=1):
        if domain_id in existing_ids:
            continue
        db.add(
            Domain(
                id=domain_id,
                display_name=display_name,
                sort_order=sort_order,
                is_system_default=True,
            )
        )

    await db.commit()


class DomainGraphBuilder:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def refresh_graph_for_user(self, user_id: str) -> KnowledgeGraphData:
        await ensure_default_domains(self.db)
        await self.compute_domain_relations(user_id)
        graph = await self.build_graph(user_id)
        await self.save_layout(user_id, graph)
        return graph

    async def compute_domain_relations(self, user_id: str) -> None:
        await self.db.execute(delete(DomainRelation).where(DomainRelation.user_id == user_id))

        content_rows = await self.db.execute(
            select(Content.id, Content.content_date)
            .where(Content.user_id == user_id, Content.status == "completed")
            .order_by(Content.content_date, Content.created_at)
        )
        content_dates = {content_id: content_date for content_id, content_date in content_rows.all()}

        quote_rows = await self.db.execute(
            select(Quote.content_id, QuoteDomain.domain_id)
            .join(QuoteDomain, QuoteDomain.quote_id == Quote.id)
            .where(Quote.user_id == user_id)
        )
        domains_by_content: dict[str, set[str]] = defaultdict(set)
        domain_frequency: Counter[str] = Counter()
        for content_id, domain_id in quote_rows.all():
            domains_by_content[content_id].add(domain_id)
            domain_frequency[domain_id] += 1

        content_ids_by_domain: dict[str, set[str]] = defaultdict(set)
        for content_id, domain_ids in domains_by_content.items():
            for domain_id in domain_ids:
                content_ids_by_domain[domain_id].add(content_id)

        for domain_a_id, domain_b_id in combinations(sorted(content_ids_by_domain.keys()), 2):
            co_occurrence_count = len(content_ids_by_domain[domain_a_id] & content_ids_by_domain[domain_b_id])
            if co_occurrence_count == 0:
                continue

            total_contents = len(content_ids_by_domain[domain_a_id] | content_ids_by_domain[domain_b_id]) or 1
            co_occurrence_score = co_occurrence_count / total_contents

            date_a = {content_dates[content_id] for content_id in content_ids_by_domain[domain_a_id] if content_dates.get(content_id)}
            date_b = {content_dates[content_id] for content_id in content_ids_by_domain[domain_b_id] if content_dates.get(content_id)}
            temporal_score = 0.0
            if date_a and date_b:
                min_diff = min(abs((a - b).days) for a in date_a for b in date_b)
                temporal_score = 1.0 / (min_diff + 1)

            total_score = 0.8 * co_occurrence_score + 0.2 * temporal_score
            self.db.add(
                DomainRelation(
                    user_id=user_id,
                    domain_a_id=domain_a_id,
                    domain_b_id=domain_b_id,
                    co_occurrence_score=co_occurrence_score,
                    temporal_score=temporal_score,
                    total_score=total_score,
                )
            )

        await self.db.commit()

    async def build_graph(self, user_id: str) -> KnowledgeGraphData:
        domain_rows = await self.db.execute(
            select(Domain.id, Domain.display_name, Domain.sort_order)
            .join(QuoteDomain, QuoteDomain.domain_id == Domain.id)
            .join(Quote, Quote.id == QuoteDomain.quote_id)
            .where(Quote.user_id == user_id)
            .distinct()
            .order_by(Domain.sort_order, Domain.display_name)
        )
        domains = domain_rows.all()

        quote_count_rows = await self.db.execute(
            select(QuoteDomain.domain_id, Quote.id)
            .join(Quote, Quote.id == QuoteDomain.quote_id)
            .where(Quote.user_id == user_id)
        )
        quote_counts: Counter[str] = Counter(domain_id for domain_id, _ in quote_count_rows.all())

        nodes: list[KnowledgeGraphNode] = []
        edges: list[KnowledgeGraphEdge] = []
        radius = 220.0
        angle_step = 2 * math.pi / max(len(domains), 1)

        for index, (domain_id, display_name, _) in enumerate(domains):
            angle = index * angle_step
            nodes.append(
                KnowledgeGraphNode(
                    id=domain_id,
                    type="domain",
                    label=display_name,
                    x=radius * math.cos(angle),
                    y=radius * math.sin(angle),
                    size=max(24.0, math.sqrt(max(quote_counts[domain_id], 1)) * 18),
                    item_count=quote_counts[domain_id],
                )
            )

        relation_rows = await self.db.execute(
            select(DomainRelation)
            .where(DomainRelation.user_id == user_id, DomainRelation.total_score > 0)
            .order_by(DomainRelation.total_score.desc())
        )
        for relation in relation_rows.scalars():
            edges.append(
                KnowledgeGraphEdge(
                    source=relation.domain_a_id,
                    target=relation.domain_b_id,
                    type="related",
                    strength=relation.total_score,
                )
            )

        return KnowledgeGraphData(nodes=nodes, edges=edges, layout_version="2")

    async def save_layout(self, user_id: str, data: KnowledgeGraphData) -> None:
        result = await self.db.execute(select(GraphLayout).where(GraphLayout.user_id == user_id))
        layout = result.scalar_one_or_none()
        layout_data = {
            "nodes": [node.model_dump() for node in data.nodes],
            "edges": [edge.model_dump() for edge in data.edges],
            "layout_version": data.layout_version,
        }
        if layout:
            layout.layout_data = layout_data
            layout.version += 1
        else:
            self.db.add(GraphLayout(user_id=user_id, layout_data=layout_data, version=1))
        await self.db.commit()
