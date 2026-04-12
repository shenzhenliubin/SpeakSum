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
    mock_llm.generate = AsyncMock(return_value=(
        '{"cleaned_text": "cleaned text", '
        '"key_quotes": ["q1"], '
        '"topics": ["t1"], '
        '"sentiment": "positive"}'
    ))
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
    mock_llm.generate.assert_awaited_once()


@pytest.mark.asyncio
async def test_process_speech_supports_json_code_fence(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value=(
        "```json\n"
        '{"cleaned_text":"fenced text","key_quotes":["q1","q2"],"topics":["战略"],"sentiment":"mixed"}'
        "\n```"
    ))
    processor = TextProcessor(mock_llm)

    result = await processor.process_speech({
        "raw_text": "original text",
        "timestamp": "10:30",
        "speaker": "我",
        "word_count": 10,
    })

    assert result["cleaned_text"] == "fenced text"
    assert result["key_quotes"] == ["q1", "q2"]
    assert result["topics"] == ["战略"]
    assert result["sentiment"] == "mixed"


def test_create_speech_batches_keeps_speech_boundaries(mock_llm) -> None:
    mock_llm.count_tokens = lambda text: len(text)
    processor = TextProcessor(mock_llm)

    speeches = [
        {"sequence_number": 1, "raw_text": "aaaaaa"},
        {"sequence_number": 2, "raw_text": "bbbbbb"},
        {"sequence_number": 3, "raw_text": "cccccc"},
    ]

    batches = processor.create_speech_batches(speeches, max_input_tokens=28)

    assert [[speech["sequence_number"] for speech in batch] for batch in batches] == [[1, 2], [3]]


def test_create_speech_batches_limits_batch_size(mock_llm) -> None:
    mock_llm.count_tokens = lambda text: 1
    processor = TextProcessor(mock_llm)

    speeches = [
        {"sequence_number": index, "raw_text": f"speech-{index}"}
        for index in range(1, 8)
    ]

    batches = processor.create_speech_batches(speeches, max_input_tokens=100, max_batch_items=3)

    assert [[speech["sequence_number"] for speech in batch] for batch in batches] == [[1, 2, 3], [4, 5, 6], [7]]


@pytest.mark.asyncio
async def test_process_speech_batch_uses_single_llm_call(mock_llm) -> None:
    mock_llm.generate = AsyncMock(return_value=(
        '{"items": ['
        '{"sequence_number": 1, "cleaned_text": "cleaned 1", "key_quotes": ["q1"], "topics": ["t1"], "sentiment": "positive"}, '
        '{"sequence_number": 2, "cleaned_text": "cleaned 2", "key_quotes": [], "topics": ["t2"], "sentiment": "neutral"}'
        ']}'
    ))
    processor = TextProcessor(mock_llm)

    result = await processor.process_speech_batch([
        {"sequence_number": 1, "raw_text": "original 1", "timestamp": "10:00", "speaker": "我", "word_count": 10},
        {"sequence_number": 2, "raw_text": "original 2", "timestamp": "10:01", "speaker": "我", "word_count": 12},
    ])

    assert [item["cleaned_text"] for item in result] == ["cleaned 1", "cleaned 2"]
    assert result[0]["key_quotes"] == ["q1"]
    assert result[1]["topics"] == ["t2"]
    mock_llm.generate.assert_awaited_once()


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
