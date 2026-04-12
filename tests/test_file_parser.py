"""Tests for file parser service."""

from datetime import date

import pytest

from speaksum.services.file_parser import extract_meeting_date, extract_speeches, parse_file, parse_txt


def test_extract_speeches_simple() -> None:
    content = "[10:30] 张三: hello world\n[10:31] 李四: test message"
    speeches = extract_speeches(content, target_speaker="张三")
    assert len(speeches) == 1
    assert speeches[0]["speaker"] == "张三"
    assert "hello world" in speeches[0]["raw_text"]


def test_extract_speeches_no_match() -> None:
    content = "[10:30] 张三: hello world\n[10:31] 李四: test message"
    speeches = extract_speeches(content, target_speaker="王五")
    assert len(speeches) == 0


def test_extract_speeches_multiple() -> None:
    content = """[10:30] 我: 我觉得这个方案不错
[10:31] 张三: 我同意
[10:32] 我: 另外还需要考虑成本"""
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 2
    assert all(s["speaker"] == "我" for s in speeches)


def test_parse_txt(tmp_path) -> None:
    txt_file = tmp_path / "meeting.txt"
    txt_file.write_text("[10:30] 我: hello world", encoding="utf-8")
    content = parse_txt(str(txt_file))
    assert "hello world" in content


def test_parse_file_txt(tmp_path) -> None:
    txt_file = tmp_path / "meeting.txt"
    txt_file.write_text("[10:30] 我: hello world", encoding="utf-8")
    content = parse_file(str(txt_file))
    assert "hello world" in content


def test_parse_md(tmp_path) -> None:
    """Test parsing markdown file."""
    md_file = tmp_path / "meeting.md"
    md_file.write_text("# Meeting Notes\n\n[10:30] 我: hello world", encoding="utf-8")
    content = parse_file(str(md_file))
    assert "hello world" in content
    assert "Meeting Notes" in content


def test_parse_file_dispatcher_docx(tmp_path) -> None:
    """Test parse_file dispatcher for docx extension."""
    from unittest.mock import patch

    docx_file = tmp_path / "meeting.docx"
    docx_file.write_text("mock content", encoding="utf-8")

    with patch("speaksum.services.file_parser.parse_docx") as mock_parse_docx:
        mock_parse_docx.return_value = "parsed docx content"
        content = parse_file(str(docx_file))
        assert content == "parsed docx content"
        mock_parse_docx.assert_called_once_with(str(docx_file))


def test_parse_file_dispatcher_doc(tmp_path) -> None:
    """Test parse_file dispatcher for doc extension."""
    from unittest.mock import patch

    doc_file = tmp_path / "meeting.doc"
    doc_file.write_text("mock content", encoding="utf-8")

    with patch("speaksum.services.file_parser.parse_doc") as mock_parse_doc:
        mock_parse_doc.return_value = "parsed doc content"
        content = parse_file(str(doc_file))
        assert content == "parsed doc content"
        mock_parse_doc.assert_called_once_with(str(doc_file))


def test_parse_file_unsupported_extension(tmp_path) -> None:
    """Test parse_file with unsupported extension."""
    from speaksum.core.exceptions import SpeakSumException

    pdf_file = tmp_path / "meeting.pdf"
    pdf_file.write_text("pdf content", encoding="utf-8")

    with pytest.raises(SpeakSumException) as exc_info:
        parse_file(str(pdf_file))
    assert "Unsupported file format" in str(exc_info.value)


def test_extract_speeches_various_timestamp_formats() -> None:
    """Test extracting speeches with various timestamp formats."""
    # With seconds
    content = "[10:30:15] 我: hello world"
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 1
    assert speeches[0]["timestamp"] == "10:30:15"

    # Without seconds
    content = "[10:30] 我: hello world"
    speeches = extract_speeches(content, target_speaker="我")
    assert len(speeches) == 1
    assert speeches[0]["timestamp"] == "10:30"


def test_extract_speeches_various_speaker_formats() -> None:
    """Test extracting speeches with various speaker name formats."""
    # Chinese colon
    content = "[10:30] 张三：hello world"
    speeches = extract_speeches(content, target_speaker="张三")
    assert len(speeches) == 1
    assert speeches[0]["speaker"] == "张三"
    assert "hello world" in speeches[0]["raw_text"]

    # English colon
    content = "[10:30] 张三: hello world"
    speeches = extract_speeches(content, target_speaker="张三")
    assert len(speeches) == 1
    assert speeches[0]["speaker"] == "张三"


def test_extract_speeches_empty_content() -> None:
    """Test extracting speeches from empty content."""
    speeches = extract_speeches("", target_speaker="我")
    assert len(speeches) == 0

    speeches = extract_speeches("   \n\n   ", target_speaker="我")
    assert len(speeches) == 0


def test_extract_meeting_date_from_text() -> None:
    assert extract_meeting_date("创建时间：2026-03-14 10:00") == date(2026, 3, 14)


def test_extract_meeting_date_from_filename_fallback() -> None:
    assert extract_meeting_date("", "数字化决策委员会专题会议-2021-09-21.docx") == date(2021, 9, 21)


def test_extract_meeting_date_supports_chinese_date_format() -> None:
    assert extract_meeting_date("会议日期：2021年9月21日") == date(2021, 9, 21)
