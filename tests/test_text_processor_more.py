"""Additional tests for text processor to improve coverage."""

from unittest.mock import AsyncMock

import pytest

from speaksum.core.exceptions import SpeakSumException
from speaksum.services.text_processor import TextProcessor


@pytest.fixture
def mock_llm():
    return AsyncMock()


@pytest.mark.asyncio
async def test_extract_topics(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value='{"topics": ["产品", "策略"]}')
    processor = TextProcessor(mock_llm)
    result = await processor.extract_topics("test")
    assert result == ["产品", "策略"]


@pytest.mark.asyncio
async def test_extract_topics_invalid_json(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value='invalid json')
    processor = TextProcessor(mock_llm)
    result = await processor.extract_topics("test")
    assert result == []


@pytest.mark.asyncio
async def test_extract_key_quotes_invalid_json(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value='invalid json')
    processor = TextProcessor(mock_llm)
    result = await processor.extract_key_quotes("test")
    assert result == []


@pytest.mark.asyncio
async def test_analyze_sentiment_invalid(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value="invalid_sentiment")
    processor = TextProcessor(mock_llm)
    result = await processor.analyze_sentiment("test")
    assert result == "neutral"


@pytest.mark.asyncio
async def test_process_speech(mock_llm) -> None:
    mock_llm.generate = AsyncMock(side_effect=[
        "cleaned text",
        '{"quotes": ["q1"]}',
        '{"topics": ["t1"]}',
        "positive"
    ])
    processor = TextProcessor(mock_llm)
    result = await processor.process_speech({
        "raw_text": "original text",
        "timestamp": "10:30",
        "speaker": "我",
        "word_count": 10
    })
    assert result["raw_text"] == "original text"
    assert result["cleaned_text"] == "cleaned text"
    assert result["key_quotes"] == ["q1"]
    assert result["topics"] == ["t1"]
    assert result["sentiment"] == "positive"


@pytest.mark.asyncio
async def test_process_speech_empty_text(mock_llm) -> None:
    processor = TextProcessor(mock_llm)
    with pytest.raises(SpeakSumException) as exc_info:
        await processor.process_speech({"raw_text": ""})
    assert "Empty speech text" in str(exc_info.value)


@pytest.mark.asyncio
async def test_process_speech_missing_text(mock_llm) -> None:
    processor = TextProcessor(mock_llm)
    with pytest.raises(SpeakSumException) as exc_info:
        await processor.process_speech({})
    assert "Empty speech text" in str(exc_info.value)
