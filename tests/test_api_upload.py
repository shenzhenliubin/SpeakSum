"""Tests for upload API."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


def test_upload_txt(authorized_client: TestClient, mock_celery_task, tmp_path) -> None:
    txt = tmp_path / "meeting.txt"
    txt.write_text("[10:30] 我: hello", encoding="utf-8")

    with open(txt, "rb") as f:
        resp = authorized_client.post(
            "/api/v1/upload",
            data={"speaker_identity": "我"},
            files={"file": ("meeting.txt", f, "text/plain")},
        )
    assert resp.status_code == 202
    data = resp.json()
    assert "task_id" in data
    assert "meeting_id" in data
    assert data["status"] == "pending"


def test_upload_missing_speaker(authorized_client: TestClient) -> None:
    resp = authorized_client.post("/api/v1/upload")
    # FastAPI returns 422 for missing required file parameter
    assert resp.status_code == 422


def test_upload_large_file(authorized_client: TestClient, tmp_path) -> None:
    big = tmp_path / "big.txt"
    big.write_bytes(b"x" * (11 * 1024 * 1024))
    with open(big, "rb") as f:
        resp = authorized_client.post(
            "/api/v1/upload",
            data={"speaker_identity": "我"},
            files={"file": ("big.txt", f, "text/plain")},
        )
    assert resp.status_code == 400


def test_upload_unsupported_format(authorized_client: TestClient, tmp_path) -> None:
    pdf = tmp_path / "meeting.pdf"
    pdf.write_bytes(b"pdf content")

    with open(pdf, "rb") as f:
        resp = authorized_client.post(
            "/api/v1/upload",
            data={"speaker_identity": "我"},
            files={"file": ("meeting.pdf", f, "application/pdf")},
        )
    assert resp.status_code == 400


def test_upload_task_status(authorized_client: TestClient) -> None:
    # Test getting task status
    mock_result = MagicMock()
    mock_result.state = "SUCCESS"
    mock_result.info = {"stage": "completed", "percent": 100, "meeting_id": "test-meeting-id"}

    with patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result):
        resp = authorized_client.get("/api/v1/upload/task-123/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert data["percent"] == 100
