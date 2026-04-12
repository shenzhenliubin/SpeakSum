"""Rule-based speaker evidence scanning."""

import re
from typing import Any


SPEAKER_TURN_PATTERN = re.compile(r"^(?P<speaker>.+?)\s+(?P<timestamp>\d{2}:\d{2}:\d{2})$")


def _normalize_terms(display_name: str, aliases: list[str] | None) -> list[tuple[str, str]]:
    terms: list[tuple[str, str]] = []
    seen: set[str] = set()

    for label, raw in [("display_name", display_name), *[("alias", alias) for alias in (aliases or [])]]:
        term = raw.strip()
        if not term or term in seen:
            continue
        seen.add(term)
        terms.append((label, term))

    return terms


def scan_speaker_evidence(
    text: str,
    display_name: str,
    aliases: list[str] | None = None,
    max_candidates: int = 5,
) -> dict[str, Any]:
    lines = [line.strip() for line in text.splitlines()]
    evidence_hits: list[dict[str, Any]] = []
    candidate_spans: list[str] = []
    seen_spans: set[str] = set()
    score = 0

    terms = _normalize_terms(display_name, aliases)

    for line_index, line in enumerate(lines):
        if not line:
            continue

        for source, term in terms:
            if term not in line:
                continue

            evidence_hits.append({
                "term": term,
                "source": source,
                "line_index": line_index,
                "line": line,
            })
            score += 3 if source == "display_name" else 1

            start = max(0, line_index - 1)
            end = min(len(lines), line_index + 2)
            span = "\n".join(candidate for candidate in lines[start:end] if candidate).strip()
            if span and span not in seen_spans and len(candidate_spans) < max_candidates:
                seen_spans.add(span)
                candidate_spans.append(span)

            break

    speaker_turns = extract_speaker_turns(text, display_name, aliases)

    return {
        "matched": bool(evidence_hits),
        "pre_scan_score": score,
        "evidence_hits": evidence_hits,
        "candidate_spans": candidate_spans,
        "speaker_turns": speaker_turns,
        "speaker_turn_count": len(speaker_turns),
    }


def extract_speaker_turns(
    text: str,
    display_name: str,
    aliases: list[str] | None = None,
    max_turns: int = 200,
) -> list[dict[str, str]]:
    terms = {term for _, term in _normalize_terms(display_name, aliases)}
    turns: list[dict[str, str]] = []
    current_speaker: str | None = None
    current_timestamp: str | None = None
    current_lines: list[str] = []

    def flush_current() -> None:
        nonlocal current_speaker, current_timestamp, current_lines
        if current_speaker in terms and current_lines:
            turns.append({
                "speaker": current_speaker,
                "timestamp": current_timestamp or "",
                "text": "\n".join(current_lines).strip(),
            })
        current_speaker = None
        current_timestamp = None
        current_lines = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        speaker_match = SPEAKER_TURN_PATTERN.match(line)
        if speaker_match:
            flush_current()
            current_speaker = speaker_match.group("speaker").strip()
            current_timestamp = speaker_match.group("timestamp")
            if len(turns) >= max_turns:
                break
            continue

        if current_speaker is not None:
            current_lines.append(line)

    flush_current()
    return turns[:max_turns]
