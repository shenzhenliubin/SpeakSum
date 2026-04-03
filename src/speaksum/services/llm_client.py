"""Multi-provider LLM client abstraction."""

from abc import ABC, abstractmethod
from typing import Any

import httpx

from speaksum.core.config import settings
from speaksum.core.exceptions import SpeakSumException


def _default_count_tokens(text: str) -> int:
    # Conservative estimate: ~1.2 tokens per CN char, ~0.25 per EN word
    cn_count = sum(1 for ch in text if "\u4e00" <= ch <= "\u9fff")
    en_count = len([w for w in text.split() if w.isascii()])
    return int(cn_count * 1.2 + en_count * 0.25)


class BaseLLMClient(ABC):
    @abstractmethod
    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        raise NotImplementedError

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        raise NotImplementedError

    def count_tokens(self, text: str) -> int:
        return _default_count_tokens(text)

    def get_context_limit(self) -> int:
        return 128000


class KimiClient(BaseLLMClient):
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str = "moonshot-v1-128k",
    ) -> None:
        self.api_key = api_key or settings.KIMI_API_KEY or ""
        self.base_url = base_url or "https://api.moonshot.cn/v1"
        self.model = model
        if not self.api_key:
            raise SpeakSumException("Kimi API key not configured", status_code=400)

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return str(data["choices"][0]["message"]["content"])

    async def embed(self, text: str) -> list[float]:
        # Kimi may not provide embedding; fallback to OpenAI-compatible endpoint if available
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": "text-embedding-3-small", "input": text},
            )
            resp.raise_for_status()
            data = resp.json()
            return list(data["data"][0]["embedding"])


class OpenAIClient(BaseLLMClient):
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str = "gpt-4-turbo",
    ) -> None:
        self.api_key = api_key or settings.OPENAI_API_KEY or ""
        try:
            from openai import AsyncOpenAI
        except ImportError as exc:  # pragma: no cover
            raise SpeakSumException("openai package not installed", status_code=500) from exc
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=base_url)
        self.model = model
        if not self.api_key:
            raise SpeakSumException("OpenAI API key not configured", status_code=400)

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def embed(self, text: str) -> list[float]:
        response = await self.client.embeddings.create(
            model="text-embedding-3-small", input=text
        )
        return response.data[0].embedding


class ClaudeClient(BaseLLMClient):
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str = "claude-3-sonnet-20240229",
    ) -> None:
        self.api_key = api_key or settings.CLAUDE_API_KEY or ""
        try:
            from anthropic import AsyncAnthropic
        except ImportError as exc:  # pragma: no cover
            raise SpeakSumException(
                "anthropic package not installed", status_code=500
            ) from exc
        self.client = AsyncAnthropic(api_key=self.api_key, base_url=base_url)
        self.model = model
        if not self.api_key:
            raise SpeakSumException("Claude API key not configured", status_code=400)

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        system = ""
        filtered = []
        for m in messages:
            if m.get("role") == "system":
                system = m.get("content", "")
            else:
                filtered.append({"role": m["role"], "content": m["content"]})
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens or 4096,
            temperature=temperature,
            system=system,
            messages=filtered,  # type: ignore[arg-type]
        )
        return str(response.content[0].text)  # type: ignore[union-attr]

    async def embed(self, text: str) -> list[float]:
        # Claude does not provide embeddings directly; raise for now
        raise SpeakSumException(
            "Claude does not support embeddings in this implementation",
            status_code=400,
        )

    def get_context_limit(self) -> int:
        return 200000


class OllamaClient(BaseLLMClient):
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama2:13b",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return str(data.get("message", {}).get("content", ""))

    async def embed(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.model, "prompt": text},
            )
            resp.raise_for_status()
            data = resp.json()
            embedding = data.get("embedding", [])
            if isinstance(embedding, list):
                return [float(x) for x in embedding]
            return []

    def get_context_limit(self) -> int:
        return 32768


def get_llm_client(
    provider: str,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> BaseLLMClient:
    provider = provider.lower()
    if provider == "kimi":
        return KimiClient(
            api_key=api_key, base_url=base_url, model=model or "moonshot-v1-128k"
        )
    if provider == "openai":
        return OpenAIClient(
            api_key=api_key, base_url=base_url, model=model or "gpt-4-turbo"
        )
    if provider == "claude":
        return ClaudeClient(
            api_key=api_key,
            base_url=base_url,
            model=model or "claude-3-sonnet-20240229",
        )
    if provider == "ollama":
        return OllamaClient(
            base_url=base_url or "http://localhost:11434",
            model=model or "llama2:13b",
        )
    raise SpeakSumException(f"Unknown LLM provider: {provider}", status_code=400)
