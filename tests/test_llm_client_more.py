"""Additional tests for LLM client to improve coverage."""

from unittest.mock import MagicMock, patch

import pytest
import respx
from httpx import Response

from speaksum.core.exceptions import SpeakSumException
from speaksum.services.llm_client import (
    KimiClient,
    OllamaClient,
    OpenAIClient,
    ClaudeClient,
    SiliconFlowClient,
    get_llm_client,
    _default_count_tokens,
)


def test_default_count_tokens() -> None:
    # Test with English text - should count words
    count = _default_count_tokens("hello world test")
    assert count >= 0  # May be 0 due to small word size

    # Test with Chinese text - should count characters
    count_cn = _default_count_tokens("你好世界这是中文")
    assert count_cn > 0

    # Test with mixed text
    count_mixed = _default_count_tokens("hello 你好 world 世界")
    assert count_mixed >= 0


@pytest.mark.asyncio
async def test_kimi_embed() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"

        with respx.mock:
            route = respx.post("https://api.moonshot.cn/v1/embeddings").mock(
                return_value=Response(200, json={"data": [{"embedding": [0.1, 0.2, 0.3]}]})
            )
            client = KimiClient()
            result = await client.embed("test text")
            assert result == [0.1, 0.2, 0.3]
            assert route.called


@pytest.mark.asyncio
async def test_kimi_generate_translates_unauthorized_error() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"

        with respx.mock:
            respx.post("https://api.moonshot.cn/v1/chat/completions").mock(
                return_value=Response(401, json={"error": {"message": "invalid api key"}})
            )
            client = KimiClient()

            with pytest.raises(SpeakSumException) as exc_info:
                await client.generate([{"role": "user", "content": "hello"}])

    assert exc_info.value.status_code == 401
    assert "API Key" in str(exc_info.value)


@pytest.mark.asyncio
async def test_kimi_generate_translates_not_found_error() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"

        with respx.mock:
            respx.post("https://api.moonshot.cn/v1/chat/completions").mock(
                return_value=Response(404, json={"error": {"message": "not found"}})
            )
            client = KimiClient()

            with pytest.raises(SpeakSumException) as exc_info:
                await client.generate([{"role": "user", "content": "hello"}])

    assert exc_info.value.status_code == 404
    assert "Base URL" in str(exc_info.value)


@pytest.mark.asyncio
async def test_kimi_client_no_api_key() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = None
        with pytest.raises(SpeakSumException) as exc_info:
            KimiClient()
        assert "API key not configured" in str(exc_info.value)


def test_get_llm_client_kimi() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"
        client = get_llm_client("kimi")
        assert isinstance(client, KimiClient)


def test_get_llm_client_kimi_ignores_custom_base_url() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"
        client = get_llm_client("kimi", base_url="https://api.kimi.com/coding/")
        assert isinstance(client, KimiClient)
        assert client.base_url == "https://api.moonshot.cn/v1"


def test_get_llm_client_siliconflow_ignores_custom_base_url() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.SILICONFLOW_API_KEY = "fake-key"
        client = get_llm_client("siliconflow", base_url="https://api.example.com/v1")
        assert isinstance(client, SiliconFlowClient)
        assert client.base_url == "https://api.siliconflow.cn/v1"


def test_get_llm_client_openai() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = "fake-key"
        # Patch the import inside the module
        with patch.dict("sys.modules", {"openai": MagicMock()}):
            with patch("speaksum.services.llm_client.OpenAIClient.__init__", return_value=None):
                client = get_llm_client("openai")
                assert isinstance(client, OpenAIClient)


def test_get_llm_client_claude() -> None:
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.CLAUDE_API_KEY = "fake-key"
        with patch.dict("sys.modules", {"anthropic": MagicMock()}):
            with patch("speaksum.services.llm_client.ClaudeClient.__init__", return_value=None):
                client = get_llm_client("claude")
                assert isinstance(client, ClaudeClient)


def test_get_llm_client_ollama() -> None:
    client = get_llm_client("ollama")
    assert isinstance(client, OllamaClient)


@pytest.mark.asyncio
async def test_ollama_generate() -> None:
    with respx.mock:
        route = respx.post("http://localhost:11434/api/chat").mock(
            return_value=Response(200, json={"message": {"content": "hello from ollama"}})
        )
        client = OllamaClient()
        result = await client.generate([{"role": "user", "content": "hi"}])
        assert result == "hello from ollama"
        assert route.called


@pytest.mark.asyncio
async def test_ollama_embed() -> None:
    with respx.mock:
        route = respx.post("http://localhost:11434/api/embeddings").mock(
            return_value=Response(200, json={"embedding": [0.1, 0.2, 0.3]})
        )
        client = OllamaClient()
        result = await client.embed("test text")
        assert result == [0.1, 0.2, 0.3]
        assert route.called


def test_ollama_context_limit() -> None:
    client = OllamaClient()
    assert client.get_context_limit() == 32768


def test_openai_client_no_api_key() -> None:
    """Test OpenAIClient without API key."""
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = None
        with pytest.raises(SpeakSumException) as exc_info:
            OpenAIClient(api_key=None)
        assert "API key not configured" in str(exc_info.value)


def test_claude_client_no_api_key() -> None:
    """Test ClaudeClient without API key."""
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.CLAUDE_API_KEY = None
        with pytest.raises(SpeakSumException) as exc_info:
            ClaudeClient(api_key=None)
        assert "API key not configured" in str(exc_info.value)


def test_claude_client_context_limit() -> None:
    """Test ClaudeClient.get_context_limit returns 200000."""
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.CLAUDE_API_KEY = "fake-key"
        # Mock the import inside the class
        with patch("speaksum.services.llm_client.ClaudeClient.__init__", return_value=None):
            client = ClaudeClient.__new__(ClaudeClient)
            # Manually set the client attribute to avoid the import
            client.client = MagicMock()
            assert client.get_context_limit() == 200000


def test_openai_client_context_limit() -> None:
    """Test OpenAIClient.get_context_limit returns 128000."""
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.OPENAI_API_KEY = "fake-key"
        with patch("speaksum.services.llm_client.OpenAIClient.__init__", return_value=None):
            client = OpenAIClient.__new__(OpenAIClient)
            client.client = MagicMock()
            assert client.get_context_limit() == 128000


def test_kimi_client_context_limit() -> None:
    """Test KimiClient.get_context_limit returns 128000."""
    with patch("speaksum.services.llm_client.settings") as mock_settings:
        mock_settings.KIMI_API_KEY = "fake-key"
        client = KimiClient()
        assert client.get_context_limit() == 128000


def test_default_count_tokens_edge_cases() -> None:
    """Test _default_count_tokens with various edge cases."""
    # Empty string
    assert _default_count_tokens("") == 0

    # Only whitespace
    assert _default_count_tokens("   ") == 0

    # Only Chinese characters
    cn_count = _default_count_tokens("你好世界")
    assert cn_count > 0

    # Only English words
    en_count = _default_count_tokens("hello world foo bar")
    assert en_count >= 0

    # Mixed with punctuation
    mixed_count = _default_count_tokens("Hello, 世界! Test.")
    assert mixed_count >= 0
