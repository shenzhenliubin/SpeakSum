"""Text processing service: cleaning, key quotes, topics, sentiment."""

import json
from typing import Any

from speaksum.core.exceptions import SpeakSumException
from speaksum.services.llm_client import BaseLLMClient


class TextProcessor:
    def __init__(self, llm_client: BaseLLMClient) -> None:
        self.llm = llm_client

    async def clean_colloquial(self, text: str) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                    "你是一位专业的中文文本编辑。请去除会议转写文本中的语气词、口头禅和重复词，"
                    "修正明显的错别字，保持原意不变。只返回清理后的文本，不要解释。"
                ),
            },
            {"role": "user", "content": text},
        ]
        return await self.llm.generate(messages, temperature=0.3)

    async def extract_key_quotes(self, text: str) -> list[str]:
        messages = [
            {
                "role": "system",
                "content": (
                    "请从以下发言中提取 0-3 条金句。金句应精炼概括核心观点、书面化表达、"
                    "去除具体人名和上下文依赖、每条不超过 50 字。输出严格 JSON 格式: {\"quotes\": [...]}"
                ),
            },
            {"role": "user", "content": text},
        ]
        result = await self.llm.generate(messages, temperature=0.5)
        try:
            data = json.loads(result)
            quotes = data.get("quotes", [])
            if isinstance(quotes, list):
                return [str(q) for q in quotes]
        except json.JSONDecodeError:
            pass
        return []

    async def extract_topics(self, text: str) -> list[str]:
        messages = [
            {
                "role": "system",
                "content": (
                    "请为以下发言提取 1-3 个话题标签，标签应简洁（2-4字），使用名词短语。"
                    "输出严格 JSON 格式: {\"topics\": [...]}"
                ),
            },
            {"role": "user", "content": text},
        ]
        result = await self.llm.generate(messages, temperature=0.5)
        try:
            data = json.loads(result)
            topics = data.get("topics", [])
            if isinstance(topics, list):
                return [str(t) for t in topics]
        except json.JSONDecodeError:
            pass
        return []

    async def analyze_sentiment(self, text: str) -> str:
        messages = [
            {
                "role": "system",
                "content": (
                    "分析以下发言的情感倾向，只返回一个单词: positive / negative / neutral / mixed"
                ),
            },
            {"role": "user", "content": text},
        ]
        result = (await self.llm.generate(messages, temperature=0.3)).strip().lower()
        allowed = {"positive", "negative", "neutral", "mixed"}
        if result not in allowed:
            return "neutral"
        return result

    async def process_speech(self, speech: dict[str, Any]) -> dict[str, Any]:
        raw = speech.get("raw_text", "")
        if not raw:
            raise SpeakSumException("Empty speech text", status_code=400)

        cleaned = await self.clean_colloquial(raw)
        quotes = await self.extract_key_quotes(cleaned)
        topics = await self.extract_topics(cleaned)
        sentiment = await self.analyze_sentiment(cleaned)

        return {
            "timestamp": speech.get("timestamp"),
            "speaker": speech.get("speaker"),
            "raw_text": raw,
            "cleaned_text": cleaned,
            "key_quotes": quotes,
            "topics": topics,
            "sentiment": sentiment,
            "word_count": speech.get("word_count", 0),
        }
