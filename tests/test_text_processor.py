"""Tests for text processor service."""

from unittest.mock import AsyncMock

import pytest

from speaksum.services.text_processor import TextProcessor


@pytest.fixture
def mock_llm():
    return AsyncMock()


@pytest.mark.asyncio
async def test_clean_colloquial(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value=" cleaned ")
    processor = TextProcessor(mock_llm)
    result = await processor.clean_colloquial("呃...")
    assert result == " cleaned "


@pytest.mark.asyncio
async def test_extract_key_quotes(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value='{"quotes": ["q1", "q2"]}')
    processor = TextProcessor(mock_llm)
    result = await processor.extract_key_quotes("test")
    assert result == ["q1", "q2"]


@pytest.mark.asyncio
async def test_analyze_sentiment(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value=" positive ")
    processor = TextProcessor(mock_llm)
    result = await processor.analyze_sentiment("great")
    assert result == "positive"
