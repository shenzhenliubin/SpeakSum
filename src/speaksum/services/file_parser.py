"""File parsing service supporting .txt, .md, .doc, .docx."""

import re
import subprocess
from datetime import date
from pathlib import Path
from typing import Any

import chardet

from speaksum.core.config import settings
from speaksum.core.exceptions import SpeakSumException


ALLOWED_EXTENSIONS = {".txt", ".md", ".doc", ".docx"}
ALLOWED_MIME_PREFIXES = (
    "text/",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
)


def validate_file_type(file_path: str) -> None:
    """Validate file extension and MIME type."""
    ext = Path(file_path).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise SpeakSumException(f"Unsupported file format: {ext}", status_code=400)

    try:
        import magic

        mime = magic.from_file(file_path, mime=True)
    except Exception:
        mime = None

    if mime and not mime.startswith(ALLOWED_MIME_PREFIXES):
        raise SpeakSumException(f"Unsupported MIME type: {mime}", status_code=400)


def _detect_encoding(file_path: str) -> str:
    with open(file_path, "rb") as f:
        raw = f.read(4096)
    result = chardet.detect(raw)
    return result.get("encoding") or "utf-8"


def parse_txt(file_path: str) -> str:
    validate_file_type(file_path)
    encoding = _detect_encoding(file_path)
    with open(file_path, "r", encoding=encoding, errors="replace") as f:
        return f.read()


def parse_md(file_path: str) -> str:
    validate_file_type(file_path)
    return parse_txt(file_path)


def parse_docx(file_path: str) -> str:
    validate_file_type(file_path)
    try:
        from docx import Document
    except ImportError as exc:  # pragma: no cover
        raise SpeakSumException("python-docx not installed", status_code=500) from exc

    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs]
    return "\n".join(paragraphs)


def parse_doc(file_path: str) -> str:
    validate_file_type(file_path)
    # Try antiword first, otherwise libreoffice conversion
    try:
        result = subprocess.run(
            ["antiword", file_path],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        return result.stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # Fallback: convert to docx with libreoffice
    temp_dir = Path(settings.UPLOAD_DIR) / ".temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    try:
        subprocess.run(
            [
                "libreoffice",
                "--headless",
                "--convertTo",
                "docx",
                "--outdir",
                str(temp_dir),
                file_path,
            ],
            capture_output=True,
            timeout=60,
            check=True,
        )
        base = Path(file_path).stem
        converted = temp_dir / f"{base}.docx"
        if converted.exists():
            text = parse_docx(str(converted))
            converted.unlink()
            return text
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    raise SpeakSumException(
        "Failed to parse .doc file. Please install antiword or libreoffice.",
        status_code=400,
    )


def parse_file(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    if ext in (".txt", ".md"):
        return parse_txt(file_path)
    if ext == ".docx":
        return parse_docx(file_path)
    if ext == ".doc":
        return parse_doc(file_path)
    raise SpeakSumException(f"Unsupported file format: {ext}", status_code=400)


# Format 1: [HH:MM:SS] 说话人：内容
SPEECH_PATTERN_BRACKET = re.compile(r"\[(\d{1,2}:\d{2}(:\d{2})?)\]\s*([^：:]+)[：:]\s*(.*)")
# Format 2: 说话人 HH:MM:SS\n内容 (content on same or next line)
SPEECH_PATTERN_INLINE = re.compile(r"^(\S+)\s+(\d{1,2}:\d{2}(:\d{2})?)\s*$")


def extract_speeches(text: str, target_speaker: str) -> list[dict[str, Any]]:
    """Extract speeches from transcript text matching target speaker.

    Supports two transcript formats:
    - [HH:MM:SS] Speaker：content
    - Speaker HH:MM:SS  (content follows on next lines until next speaker line)
    """
    speeches = []
    lines = text.splitlines()

    # First try bracket format
    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = SPEECH_PATTERN_BRACKET.match(line)
        if not match:
            continue
        timestamp = match.group(1)
        speaker = match.group(3).strip()
        content = match.group(4).strip()
        if speaker != target_speaker:
            continue
        speeches.append({
            "timestamp": timestamp,
            "speaker": speaker,
            "raw_text": content,
            "word_count": len(content),
        })

    # If bracket format found nothing, try inline format
    if not speeches:
        current_speaker: str | None = None
        current_timestamp: str | None = None
        current_lines: list[str] = []

        def _flush() -> None:
            nonlocal current_speaker, current_timestamp, current_lines
            if current_speaker and current_timestamp and current_lines:
                content = " ".join(current_lines).strip()
                if current_speaker == target_speaker and content:
                    speeches.append({
                        "timestamp": current_timestamp,
                        "speaker": current_speaker,
                        "raw_text": content,
                        "word_count": len(content),
                    })
            current_speaker = None
            current_timestamp = None
            current_lines = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            match = SPEECH_PATTERN_INLINE.match(stripped)
            if match:
                _flush()
                current_speaker = match.group(1).strip()
                current_timestamp = match.group(2)
                current_lines = []
            elif current_speaker:
                current_lines.append(stripped)
        _flush()

    return speeches


# Date extraction patterns from transcript content / file name
DATE_PATTERNS = [
    re.compile(r"创建时间[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})"),
    re.compile(r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*\d{1,2}:\d{2}"),
    re.compile(r"日期[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})"),
    re.compile(r"会议日期[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})"),
    re.compile(r"(\d{4}年\d{1,2}月\d{1,2}日)"),
]
FILENAME_DATE_PATTERN = re.compile(r"(?<!\d)(\d{4}[-_/]\d{1,2}[-_/]\d{1,2})(?!\d)")


def _parse_date_candidate(raw: str) -> date | None:
    from datetime import datetime as dt

    normalized = (
        raw.strip()
        .replace("/", "-")
        .replace("_", "-")
        .replace("年", "-")
        .replace("月", "-")
        .replace("日", "")
    )

    try:
        return dt.strptime(normalized, "%Y-%m-%d").date()
    except ValueError:
        return None


def extract_meeting_date(text: str, source_name: str | None = None) -> date | None:
    """Extract meeting date from transcript content, then fall back to file name."""
    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        parsed = _parse_date_candidate(match.group(1))
        if parsed:
            return parsed

    if source_name:
        match = FILENAME_DATE_PATTERN.search(Path(source_name).name)
        if match:
            return _parse_date_candidate(match.group(1))

    return None
