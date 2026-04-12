"""Tests for the source-aware content processor."""

import pytest

from speaksum.services.content_processor import ContentProcessor


class DummyLLM:
    def __init__(self, response: str) -> None:
        self.response = response
        self.calls: list[list[dict[str, str]]] = []

    async def generate(self, messages: list[dict[str, str]], temperature: float = 0.7, max_tokens: int | None = None) -> str:
        self.calls.append(messages)
        return self.response

    def count_tokens(self, text: str) -> int:
        return len(text)

    def get_context_limit(self) -> int:
        return 128000


@pytest.mark.asyncio
async def test_process_meeting_minutes_returns_completed_when_evidence_exists() -> None:
    llm = DummyLLM(
        """
        {
          "summary": "刘彬在会议中重点强调，应该先明确平台边界，再决定数字化资源投入节奏。",
          "quotes": [
            {
              "text": "先明确平台边界，再决定资源投入节奏。",
              "domain_ids": ["decision_method", "technology_architecture", "unknown_domain", "decision_method"]
            }
          ]
        }
        """
    )
    processor = ContentProcessor(llm)

    result = await processor.process(
        source_type="meeting_minutes",
        text="刘彬 00:01:02\n先明确平台边界，再决定资源投入节奏。",
        evidence={
            "matched": True,
            "speaker_turn_count": 1,
            "speaker_turns": [
                {
                    "speaker": "刘彬",
                    "timestamp": "00:01:02",
                    "text": "先明确平台边界，再决定资源投入节奏。",
                }
            ],
            "candidate_spans": ["刘彬 00:01:02\n先明确平台边界，再决定资源投入节奏。"],
        },
    )

    assert result["status"] == "completed"
    assert result["ignored_reason"] is None
    assert result["summary"] == "刘彬在会议中重点强调，应该先明确平台边界，再决定数字化资源投入节奏。"
    assert result["quotes"] == [
        {
            "text": "先明确平台边界，再决定资源投入节奏。",
            "domain_ids": ["decision_method", "technology_architecture", "other"],
        }
    ]
    assert len(llm.calls) == 1


@pytest.mark.asyncio
async def test_process_meeting_minutes_returns_ignored_without_evidence() -> None:
    llm = DummyLLM('{"summary":"unused","quotes":[]}')
    processor = ContentProcessor(llm)

    result = await processor.process(
        source_type="meeting_minutes",
        text="这是一份没有刘彬发言的会议纪要。",
        evidence={
            "matched": False,
            "speaker_turn_count": 0,
            "speaker_turns": [],
            "candidate_spans": [],
        },
    )

    assert result == {
        "status": "ignored",
        "ignored_reason": "未检测到刘彬发言，因此未生成记录",
        "summary": "",
        "quotes": [],
    }
    assert llm.calls == []


@pytest.mark.asyncio
async def test_process_other_text_skips_speaker_detection(monkeypatch: pytest.MonkeyPatch) -> None:
    llm = DummyLLM(
        """
        {
          "summary": "刘彬在这篇文章中强调，技术判断要服务于业务边界和长期演进。",
          "quotes": [
            {
              "text": "技术判断要服务于业务边界和长期演进。",
              "domain_ids": ["technology_architecture", "product_business"]
            }
          ]
        }
        """
    )
    processor = ContentProcessor(llm)

    def _unexpected_scan(*args, **kwargs):
        raise AssertionError("speaker evidence should not run for other_text")

    monkeypatch.setattr("speaksum.services.content_processor.scan_speaker_evidence", _unexpected_scan)

    result = await processor.process(
        source_type="other_text",
        text="技术判断要服务于业务边界和长期演进。",
    )

    assert result["status"] == "completed"
    assert result["summary"] == "刘彬在这篇文章中强调，技术判断要服务于业务边界和长期演进。"
    assert result["quotes"] == [
        {
            "text": "技术判断要服务于业务边界和长期演进。",
            "domain_ids": ["technology_architecture", "product_business"],
        }
    ]
