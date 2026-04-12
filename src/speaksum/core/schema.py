"""Schema compatibility helpers for local SQLite databases."""

from collections.abc import Iterable
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.sql.schema import Column

from speaksum.models.models import Base
from speaksum.services.file_parser import extract_meeting_date


DEFAULT_DOMAINS: list[tuple[str, str]] = [
    ("product_business", "产品与业务"),
    ("technology_architecture", "技术与架构"),
    ("delivery_execution", "项目推进与交付"),
    ("organization_collaboration", "组织协同与管理"),
    ("learning_growth", "学习成长与认知"),
    ("decision_method", "方法论与决策"),
    ("life_values", "人生选择与价值观"),
    ("health_fitness", "运动健康与身心状态"),
    ("next_generation_education", "下一代教育与成长"),
    ("investing_trading", "投资研究与交易决策"),
    ("other", "其他"),
]


def _iter_missing_columns(connection: Connection) -> Iterable[tuple[str, Column[Any]]]:
    inspector = inspect(connection)

    for table in Base.metadata.sorted_tables:
        if table.name not in inspector.get_table_names():
            continue

        existing_columns = {column["name"] for column in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing_columns or column.primary_key:
                continue
            yield table.name, column


def _build_column_definition(connection: Connection, column: Column[Any]) -> str:
    column_type = column.type.compile(dialect=connection.dialect)
    nullable = "" if column.nullable else " NOT NULL"
    return f"{column.name} {column_type}{nullable}"


def ensure_sqlite_schema_compatibility(connection: Connection) -> None:
    """Backfill newly-added columns for legacy SQLite databases."""
    if connection.dialect.name != "sqlite":
        return

    inspector = inspect(connection)

    for table in Base.metadata.sorted_tables:
        if table.name in inspector.get_table_names():
            continue
        table.create(bind=connection)

    for table_name, column in _iter_missing_columns(connection):
        column_definition = _build_column_definition(connection, column)
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_definition}"))

    meeting_rows = connection.execute(
        text("SELECT id, title, source_file, meeting_date FROM meetings WHERE meeting_date IS NULL")
    ).mappings().all()
    for row in meeting_rows:
        meeting_date = extract_meeting_date("", row["title"]) or extract_meeting_date("", row["source_file"])
        if meeting_date is None:
            continue
        connection.execute(
            text("UPDATE meetings SET meeting_date = :meeting_date WHERE id = :meeting_id"),
            {"meeting_date": meeting_date.isoformat(), "meeting_id": row["id"]},
        )

    existing_domains = {
        row["id"] for row in connection.execute(text("SELECT id FROM domains")).mappings().all()
    }
    for sort_order, (domain_id, display_name) in enumerate(DEFAULT_DOMAINS, start=1):
        if domain_id in existing_domains:
            continue
        connection.execute(
            text("""
                INSERT INTO domains (
                    id, display_name, is_system_default, sort_order, created_at, updated_at
                ) VALUES (
                    :id, :display_name, 1, :sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """),
            {
                "id": domain_id,
                "display_name": display_name,
                "sort_order": sort_order,
            },
        )
