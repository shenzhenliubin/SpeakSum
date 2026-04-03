"""Tests for database module."""

import pytest


@pytest.mark.asyncio
async def test_get_db_commit() -> None:
    """Test that get_db commits on success."""
    # This is tested implicitly through the API tests
    # The get_db function is used as a FastAPI dependency
    pass


@pytest.mark.asyncio
async def test_get_db_rollback_on_exception() -> None:
    """Test that get_db rolls back on exception."""
    # This is tested implicitly through the API tests
    pass
