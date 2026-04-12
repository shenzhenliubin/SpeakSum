"""Text processing service: cleaning, key quotes, topics, sentiment."""

import json
import re
from typing import Any

from speaksum.core.exceptions import SpeakSumException
from speaksum.services.llm_client import BaseLLMClient


class TextProcessor:
    DEFAULT_MAX_BATCH_ITEMS = 12

    def __init__(self, llm_client: BaseLLMClient) -> None:
        self.llm = llm_client

    def _parse_json_payload(self, raw: str) -> Any:
        text = raw.strip()
        fenced = re.fullmatch(r"```(?:json)?\s*(.+)\s*```", text, flags=re.DOTALL)
        if fenced:
            text = fenced.group(1).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        starts = [index for index in (text.find("{"), text.find("[")) if index != -1]
        end = max(text.rfind("}"), text.rfind("]"))
        if not starts or end == -1:
            return None
        start = min(starts)

        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return None

    def _get_batch_token_limit(self) -> int:
        return min(24000, max(4000, self.llm.get_context_limit() // 4))

    def _estimate_speech_tokens(self, speech: dict[str, Any]) -> int:
        return max(1, self.llm.count_tokens(str(speech.get("raw_text", ""))) + 8)

    def create_speech_batches(
        self,
        speeches: list[dict[str, Any]],
        max_input_tokens: int | None = None,
        max_batch_items: int | None = None,
    ) -> list[list[dict[str, Any]]]:
        if not speeches:
            return []

        limit = max_input_tokens or self._get_batch_token_limit()
        batch_item_limit = max_batch_items or self.DEFAULT_MAX_BATCH_ITEMS
        batches: list[list[dict[str, Any]]] = []
        current_batch: list[dict[str, Any]] = []
        current_tokens = 0

        for speech in speeches:
            speech_tokens = self._estimate_speech_tokens(speech)
            if current_batch and (
                current_tokens + speech_tokens > limit
                or len(current_batch) >= batch_item_limit
            ):
                batches.append(current_batch)
                current_batch = []
                current_tokens = 0

            current_batch.append(speech)
            current_tokens += speech_tokens

        if current_batch:
            batches.append(current_batch)

        return batches

    def _normalize_processed_item(
        self,
        source_speech: dict[str, Any],
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        raw = str(source_speech.get("raw_text", ""))
        quotes_raw = payload.get("key_quotes", [])
        topics_raw = payload.get("topics", [])
        sentiment = str(payload.get("sentiment", "neutral")).strip().lower()

        quotes = [str(q).strip() for q in quotes_raw] if isinstance(quotes_raw, list) else []
        topics = [str(t).strip() for t in topics_raw] if isinstance(topics_raw, list) else []

        return {
            "sequence_number": source_speech.get("sequence_number"),
            "timestamp": source_speech.get("timestamp"),
            "speaker": source_speech.get("speaker"),
            "raw_text": raw,
            "cleaned_text": str(payload.get("cleaned_text") or raw).strip(),
            "key_quotes": [quote for quote in quotes if quote][:3],
            "topics": [topic for topic in topics if topic][:3],
            "sentiment": sentiment if sentiment in {"positive", "negative", "neutral", "mixed"} else "neutral",
            "word_count": source_speech.get("word_count", 0),
        }

    async def _process_speech_batch_once(self, speeches: list[dict[str, Any]]) -> list[dict[str, Any]]:
        indexed_speeches = []
        for position, speech in enumerate(speeches, start=1):
            raw = speech.get("raw_text", "")
            if not raw:
                raise SpeakSumException("Empty speech text", status_code=400)
            indexed_speeches.append({
                "sequence_number": speech.get("sequence_number", position),
                "raw_text": raw,
            })

        messages = [
            {
                "role": "system",
                "content": (
                    "你是一位专业的中文会议内容编辑和分析助手。"
                    "现在你会收到多条同一位发言人的会议发言，请逐条处理，并保持 sequence_number 不变。"
                    "对每条发言完成："
                    "1. 去除语气词、口头禅和重复表达，修正明显错别字，保持原意不变；"
                    "2. 提取 0-3 条书面化金句，每条不超过 50 字；"
                    "3. 提取 1-3 个简洁的话题标签，标签应为 2-4 字名词短语；"
                    "4. 判断情感倾向，只能是 positive / negative / neutral / mixed。"
                    "必须严格返回 JSON，不要输出额外解释。"
                    'JSON 格式: {"items": [{"sequence_number": 1, "cleaned_text": "...", "key_quotes": [...], "topics": [...], "sentiment": "..."}]}'
                ),
            },
            {"role": "user", "content": json.dumps({"items": indexed_speeches}, ensure_ascii=False)},
        ]

        result = await self.llm.generate(messages, temperature=0.3)
        payload = self._parse_json_payload(result)
        if isinstance(payload, dict):
            items = payload.get("items")
            if items is None and len(speeches) == 1 and payload.get("cleaned_text") is not None:
                items = [{
                    "sequence_number": indexed_speeches[0]["sequence_number"],
                    **payload,
                }]
        elif isinstance(payload, list):
            items = payload
        else:
            items = None

        if not isinstance(items, list):
            raise SpeakSumException("批量清理结果解析失败", status_code=502)

        items_by_sequence = {
            int(item["sequence_number"]): item
            for item in items
            if isinstance(item, dict) and item.get("sequence_number") is not None
        }

        processed: list[dict[str, Any]] = []
        for speech in speeches:
            sequence_number = int(speech.get("sequence_number") or 0)
            item = items_by_sequence.get(sequence_number)
            if item is None:
                raise SpeakSumException("批量清理结果数量与输入不一致", status_code=502)
            processed.append(self._normalize_processed_item(speech, item))

        return processed

    async def process_speech_batch(self, speeches: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not speeches:
            return []

        try:
            return await self._process_speech_batch_once(speeches)
        except SpeakSumException as exc:
            if len(speeches) == 1 or exc.status_code != 502:
                raise
            midpoint = len(speeches) // 2
            first_half = await self.process_speech_batch(speeches[:midpoint])
            second_half = await self.process_speech_batch(speeches[midpoint:])
            return first_half + second_half

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

        [processed] = await self.process_speech_batch([{
            **speech,
            "sequence_number": speech.get("sequence_number", 1),
        }])
        return processed
