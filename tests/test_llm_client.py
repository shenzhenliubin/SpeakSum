"""Tests for LLM client abstraction."""

from unittest.mock import patch

import pytest
import respx
from httpx import Response

from speaksum.services.llm_client import (
    KimiClient,
    get_llm_client,
)


@pytest.mark.asyncio
async def test_kimi_generate() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"

        with respx.mock:
            route = respx.post("https://api.moonshot.cn/v1/chat/completions").mock(
                return_value=Response(200, json={"choices": [{"message": {"content": "hello"}}]})
            )
            client = KimiClient()
            result = await client.generate([{"role": "user", "content": "hi"}])
            assert result == "hello"
            assert route.called


def test_get_llm_client_unknown() -> None:
    from speaksum.core.exceptions import SpeakSumException
    with pytest.raises(SpeakSumException):
        get_llm_client("unknown")
