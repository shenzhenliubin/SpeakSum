"""Tests for speaker evidence pre-scan."""

from speaksum.services.speaker_evidence import scan_speaker_evidence


def test_scan_speaker_evidence_hits_display_name() -> None:
    text = """[10:00] 张三：我们先过一下方案
[10:02] 刘彬：我认为应该先明确数字化目标，再安排资源投入
[10:05] 李四：那预算怎么配？
"""

    result = scan_speaker_evidence(text, display_name="刘彬", aliases=[])

    assert result["matched"] is True
    assert result["pre_scan_score"] > 0
    assert any(hit["term"] == "刘彬" for hit in result["evidence_hits"])
    assert any("先明确数字化目标" in span for span in result["candidate_spans"])


def test_scan_speaker_evidence_hits_alias() -> None:
    text = """产品负责人 10:00
我这边建议先把范围缩小，再做试点验证
财务负责人 10:03
成本方面需要控制
"""

    result = scan_speaker_evidence(text, display_name="刘彬", aliases=["我"])

    assert result["matched"] is True
    assert any(hit["term"] == "我" for hit in result["evidence_hits"])
    assert any("我这边建议先把范围缩小" in span for span in result["candidate_spans"])


def test_scan_speaker_evidence_returns_no_match() -> None:
    text = """[10:00] 张三：我们先过一下方案
[10:05] 李四：预算本周审批
"""

    result = scan_speaker_evidence(text, display_name="刘彬", aliases=["本人"])

    assert result["matched"] is False
    assert result["pre_scan_score"] == 0
    assert result["evidence_hits"] == []
    assert result["candidate_spans"] == []


def test_scan_speaker_evidence_limits_candidate_spans() -> None:
    text = """[10:00] 刘彬：第一条观点
[10:02] 刘彬：第二条观点
[10:04] 刘彬：第三条观点
[10:06] 刘彬：第四条观点
"""

    result = scan_speaker_evidence(text, display_name="刘彬", aliases=[], max_candidates=2)

    assert len(result["candidate_spans"]) == 2
    assert result["candidate_spans"][0] != result["candidate_spans"][1]
