"""Tests for Pydantic schemas."""

import pytest
from pydantic import ValidationError

from speaksum.schemas.schemas import SpeechUpdate, ModelConfigCreate


def test_speech_update_valid_sentiment() -> None:
    update = SpeechUpdate(sentiment="positive")
    assert update.sentiment == "positive"

    update = SpeechUpdate(sentiment="negative")
    assert update.sentiment == "negative"

    update = SpeechUpdate(sentiment="neutral")
    assert update.sentiment == "neutral"

    update = SpeechUpdate(sentiment="mixed")
    assert update.sentiment == "mixed"


def test_speech_update_invalid_sentiment() -> None:
    with pytest.raises(ValidationError) as exc_info:
        SpeechUpdate(sentiment="invalid")
    assert "sentiment must be one of" in str(exc_info.value)


def test_speech_update_none_sentiment() -> None:
    update = SpeechUpdate(sentiment=None)
    assert update.sentiment is None


def test_model_config_create() -> None:
    config = ModelConfigCreate(
        provider="kimi",
        name="My Config",
        default_model="moonshot-v1-128k",
    )
    assert config.provider == "kimi"
    assert config.name == "My Config"
    assert config.default_model == "moonshot-v1-128k"
    assert config.is_default is False  # default value
    assert config.is_enabled is True   # default value
