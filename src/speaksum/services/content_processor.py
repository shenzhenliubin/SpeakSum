"""Source-aware content processing for personal summaries and quotes."""

import json
import re
from typing import Any

from speaksum.core.exceptions import SpeakSumException
from speaksum.core.schema import DEFAULT_DOMAINS
from speaksum.services.speaker_evidence import scan_speaker_evidence


DEFAULT_OWNER_IDENTITY = "刘彬"
KNOWN_DOMAIN_IDS = [domain_id for domain_id, _ in DEFAULT_DOMAINS]
KNOWN_DOMAIN_SET = set(KNOWN_DOMAIN_IDS)


class ContentProcessor:
    MAX_QUOTES = 8
    MAX_DOMAINS_PER_QUOTE = 3

    def __init__(self, llm_client: Any) -> None:
        self.llm = llm_client

    def _parse_json_payload(self, raw: str) -> dict[str, Any] | None:
        text = raw.strip()
        fenced = re.fullmatch(r"```(?:json)?\s*(.+)\s*```", text, flags=re.DOTALL)
        if fenced:
            text = fenced.group(1).strip()

        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start == -1 or end == -1:
                return None
            try:
                payload = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                return None

        return payload if isinstance(payload, dict) else None

    def _normalize_domain_ids(self, raw_domain_ids: Any) -> list[str]:
        if not isinstance(raw_domain_ids, list):
            return ["other"]

        normalized: list[str] = []
        seen: set[str] = set()
        unknown_seen = False
        for domain_id in raw_domain_ids:
            value = str(domain_id).strip()
            if not value:
                continue
            if value in KNOWN_DOMAIN_SET:
                if value in seen:
                    continue
                seen.add(value)
                normalized.append(value)
            else:
                unknown_seen = True

            if len(normalized) >= self.MAX_DOMAINS_PER_QUOTE:
                break

        if unknown_seen and "other" not in seen and len(normalized) < self.MAX_DOMAINS_PER_QUOTE:
            normalized.append("other")

        return normalized or ["other"]

    def _normalize_quotes(self, raw_quotes: Any) -> list[dict[str, Any]]:
        if not isinstance(raw_quotes, list):
            return []

        quotes: list[dict[str, Any]] = []
        seen_texts: set[str] = set()
        for raw_quote in raw_quotes:
            if isinstance(raw_quote, str):
                text = raw_quote.strip()
                domain_ids = ["other"]
            elif isinstance(raw_quote, dict):
                text = str(raw_quote.get("text") or raw_quote.get("quote") or "").strip()
                domain_ids = self._normalize_domain_ids(raw_quote.get("domain_ids"))
            else:
                continue

            if not text or text in seen_texts:
                continue
            seen_texts.add(text)
            quotes.append({"text": text, "domain_ids": domain_ids})
            if len(quotes) >= self.MAX_QUOTES:
                break

        return quotes

    def _normalize_result(self, payload: dict[str, Any]) -> dict[str, Any]:
        summary = str(payload.get("summary") or payload.get("summary_text") or "").strip()
        if not summary:
            raise SpeakSumException("内容总结结果缺少 summary 字段", status_code=502)

        quotes = self._normalize_quotes(payload.get("quotes"))

        return {
            "status": "completed",
            "ignored_reason": None,
            "summary": summary,
            "quotes": quotes,
        }

    def _has_speaker_evidence(self, evidence: dict[str, Any] | None) -> bool:
        if not isinstance(evidence, dict):
            return False
        return bool(evidence.get("matched")) or int(evidence.get("speaker_turn_count") or 0) > 0

    def _build_meeting_minutes_messages(
        self,
        text: str,
        owner_identity: str,
        evidence: dict[str, Any] | None,
    ) -> list[dict[str, str]]:
        system_prompt = (
            "你是刘彬个人知识系统的内容整理助手。"
            "请先理解整份会议纪要的上下文，但只整理刘彬本人的发言。"
            "输出一段发言总结 summary，以及 3-8 条思想型金句 quotes。"
            "summary 必须是一段客观归纳，可以自然组织为首先、其次、再次，但不要变成零散标签。"
            "quotes 中每条都必须表达明确观点、洞察或方法，不要写流程性废话。"
            "每条 quote 都必须带 domain_ids，且只能从这些领域里选择："
            + ", ".join(KNOWN_DOMAIN_IDS)
            + "。"
            "严格返回 JSON，字段只能包含 summary 和 quotes。"
        )
        payload = {
            "source_type": "meeting_minutes",
            "owner_identity": owner_identity,
            "rules_evidence": evidence or {},
            "transcript": text,
        }
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ]

    def _build_other_text_messages(self, text: str, owner_identity: str) -> list[dict[str, str]]:
        system_prompt = (
            "你是刘彬个人知识系统的内容整理助手。"
            "这里输入的文本默认就是刘彬本人写下或表达的内容，不需要判断说话人。"
            "输出一段发言总结 summary，以及 3-8 条思想型金句 quotes。"
            "summary 必须是一段整体归纳，不要写成标签列表。"
            "quotes 中每条都必须表达明确观点、洞察或方法。"
            "每条 quote 都必须带 domain_ids，且只能从这些领域里选择："
            + ", ".join(KNOWN_DOMAIN_IDS)
            + "。"
            "严格返回 JSON，字段只能包含 summary 和 quotes。"
        )
        payload = {
            "source_type": "other_text",
            "owner_identity": owner_identity,
            "text": text,
        }
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ]

    async def process(
        self,
        source_type: str,
        text: str,
        owner_identity: str = DEFAULT_OWNER_IDENTITY,
        aliases: list[str] | None = None,
        evidence: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        normalized_source_type = source_type.strip().lower()
        if normalized_source_type not in {"meeting_minutes", "other_text"}:
            raise SpeakSumException(f"Unsupported source_type: {source_type}", status_code=400)

        if normalized_source_type == "meeting_minutes":
            if evidence is None:
                evidence = scan_speaker_evidence(text, display_name=owner_identity, aliases=aliases)
            if not self._has_speaker_evidence(evidence):
                return {
                    "status": "ignored",
                    "ignored_reason": f"未检测到{owner_identity}发言，因此未生成记录",
                    "summary": "",
                    "quotes": [],
                }
            messages = self._build_meeting_minutes_messages(text=text, owner_identity=owner_identity, evidence=evidence)
        else:
            messages = self._build_other_text_messages(text=text, owner_identity=owner_identity)

        raw = await self.llm.generate(messages, temperature=0.2)
        payload = self._parse_json_payload(raw)
        if payload is None:
            raise SpeakSumException("内容整理结果解析失败", status_code=502)
        return self._normalize_result(payload)
