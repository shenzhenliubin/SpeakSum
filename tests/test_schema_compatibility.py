from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from speaksum.models.models import Meeting, User
from speaksum.core.schema import ensure_sqlite_schema_compatibility


@pytest.mark.asyncio
async def test_ensure_sqlite_schema_compatibility_adds_missing_meeting_columns(tmp_path: Path) -> None:
    db_path = tmp_path / "legacy.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")

    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(100),
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME,
                updated_at DATETIME
            )
        """))
        await conn.execute(text("""
            CREATE TABLE meetings (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                meeting_date DATE,
                duration_minutes INTEGER,
                participants JSON,
                error_message TEXT,
                source_file VARCHAR(255) NOT NULL,
                file_size INTEGER,
                status VARCHAR(50),
                created_at DATETIME,
                updated_at DATETIME
            )
        """))
        await conn.run_sync(ensure_sqlite_schema_compatibility)

    async with engine.connect() as conn:
        columns = await conn.execute(text("PRAGMA table_info(meetings)"))
        column_names = {row[1] for row in columns.fetchall()}

    assert {"context_summary", "key_quotes", "ignored_reason"}.issubset(column_names)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        session.add(User(id="user-1", email="user@example.com", password_hash="hashed"))
        await session.commit()

        meeting = Meeting(
            user_id="user-1",
            title="Legacy upload check",
            source_file="uploads/check.txt",
            file_size=42,
            status="pending",
        )
        session.add(meeting)
        await session.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_ensure_sqlite_schema_compatibility_backfills_meeting_date_from_title(tmp_path: Path) -> None:
    db_path = tmp_path / "legacy-date.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")

    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(100),
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME,
                updated_at DATETIME
            )
        """))
        await conn.execute(text("""
            CREATE TABLE meetings (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                meeting_date DATE,
                duration_minutes INTEGER,
                participants JSON,
                error_message TEXT,
                source_file VARCHAR(255) NOT NULL,
                file_size INTEGER,
                status VARCHAR(50),
                created_at DATETIME,
                updated_at DATETIME
            )
        """))
        await conn.execute(text("""
            INSERT INTO meetings (
                id, user_id, title, meeting_date, source_file, file_size, status
            ) VALUES (
                'meeting-1', 'user-1', '数字化决策委员会专题会议-2021-09-21.docx', NULL, 'uploads/random.docx', 1, 'completed'
            )
        """))
        await conn.run_sync(ensure_sqlite_schema_compatibility)

    async with engine.connect() as conn:
        row = (await conn.execute(text("SELECT meeting_date FROM meetings WHERE id = 'meeting-1'"))).fetchone()
        assert row is not None
        assert row[0] == "2021-09-21"

    await engine.dispose()


@pytest.mark.asyncio
async def test_ensure_sqlite_schema_compatibility_creates_content_tables_and_seeds_domains(
    tmp_path: Path,
) -> None:
    db_path = tmp_path / "legacy-content.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")

    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(100),
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME,
                updated_at DATETIME
            )
        """))
        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash) VALUES ('user-1', 'user@example.com', 'hashed')
        """))
        await conn.run_sync(ensure_sqlite_schema_compatibility)

    async with engine.connect() as conn:
        tables = {
            row[0]
            for row in (await conn.execute(text("SELECT name FROM sqlite_master WHERE type = 'table'"))).fetchall()
        }
        assert {"contents", "quotes", "domains", "quote_domains", "domain_relations"}.issubset(tables)

        domains = (await conn.execute(text("SELECT id FROM domains ORDER BY sort_order"))).fetchall()
        assert [row[0] for row in domains] == [
            "product_business",
            "technology_architecture",
            "delivery_execution",
            "organization_collaboration",
            "learning_growth",
            "decision_method",
            "life_values",
            "health_fitness",
            "next_generation_education",
            "investing_trading",
            "other",
        ]

    await engine.dispose()
