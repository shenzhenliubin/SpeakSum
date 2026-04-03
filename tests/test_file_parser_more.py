"""Additional tests for file parser to improve coverage."""

import pytest

from speaksum.core.exceptions import SpeakSumException
from speaksum.services.file_parser import (
    extract_speeches,
    parse_md,
    validate_file_type,
)


def test_extract_speeches_with_colon() -> None:
    """Test extracting speeches with colon separator."""
    content = "[10:30] 我: hello world"
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 1
    assert speeches[0]["timestamp"] == "10:30"
    assert speeches[0]["speaker"] == "我"
    assert speeches[0]["raw_text"] == "hello world"


def test_extract_speeches_with_chinese_colon() -> None:
    """Test extracting speeches with Chinese colon separator."""
    content = "[10:30] 我：hello world"
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 1
    assert speeches[0]["raw_text"] == "hello world"


def test_extract_speeches_with_seconds() -> None:
    """Test extracting speeches with seconds in timestamp."""
    content = "[10:30:45] 我: hello world"
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 1
    assert speeches[0]["timestamp"] == "10:30:45"


def test_extract_speeches_empty_lines() -> None:
    """Test extracting speeches with empty lines."""
    content = "[10:30] 我: hello\n\n[10:31] 我: world"
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 2


def test_extract_speeches_no_match_pattern() -> None:
    """Test extracting speeches that don't match pattern."""
    content = "This is not a valid speech line\nAnother invalid line"
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 0


def test_parse_md(tmp_path) -> None:
    """Test parsing markdown file."""
    md_file = tmp_path / "meeting.md"
    md_file.write_text("# Meeting\n\n[10:30] 我: hello", encoding="utf-8")
    content = parse_md(str(md_file))
    assert "hello" in content


def test_validate_file_type_txt(tmp_path) -> None:
    """Test validating txt file type."""
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("content")
    # Should not raise
    validate_file_type(str(txt_file))


def test_validate_file_type_unsupported(tmp_path) -> None:
    """Test validating unsupported file type."""
    pdf_file = tmp_path / "test.pdf"
    pdf_file.write_text("content")
    with pytest.raises(SpeakSumException) as exc_info:
        validate_file_type(str(pdf_file))
    assert "Unsupported file format" in str(exc_info.value)
