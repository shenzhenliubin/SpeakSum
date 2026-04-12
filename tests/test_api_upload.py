"""Tests for upload API."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient


def test_upload_txt(authorized_client: TestClient, mock_celery_task, tmp_path) -> None:
    txt = tmp_path / "meeting.txt"
    txt.write_text("[10:30] 我: hello", encoding="utf-8")

    with patch("speaksum.api.upload._has_celery_workers", return_value=True):
        with open(txt, "rb") as f:
            resp = authorized_client.post(
                "/api/v1/upload",
                data={"source_type": "meeting_minutes"},
                files={"file": ("meeting.txt", f, "text/plain")},
            )
    assert resp.status_code == 202
    data = resp.json()
    assert "task_id" in data
    assert "content_id" in data
    assert data["status"] == "pending"


def test_upload_missing_file(authorized_client: TestClient) -> None:
    resp = authorized_client.post("/api/v1/upload")
    # FastAPI returns 422 for missing required file parameter
    assert resp.status_code == 422


def test_upload_large_file(authorized_client: TestClient, tmp_path) -> None:
    big = tmp_path / "big.txt"
    big.write_bytes(b"x" * (11 * 1024 * 1024))
    with patch("speaksum.api.upload._has_celery_workers", return_value=True):
        with open(big, "rb") as f:
            resp = authorized_client.post(
                "/api/v1/upload",
                data={"source_type": "meeting_minutes"},
                files={"file": ("big.txt", f, "text/plain")},
            )
    assert resp.status_code == 400


def test_upload_unsupported_format(authorized_client: TestClient, tmp_path) -> None:
    pdf = tmp_path / "meeting.pdf"
    pdf.write_bytes(b"pdf content")

    with patch("speaksum.api.upload._has_celery_workers", return_value=True):
        with open(pdf, "rb") as f:
            resp = authorized_client.post(
                "/api/v1/upload",
                data={"source_type": "meeting_minutes"},
                files={"file": ("meeting.pdf", f, "application/pdf")},
            )
    assert resp.status_code == 400


def test_upload_returns_503_without_celery_workers(authorized_client: TestClient, tmp_path) -> None:
    txt = tmp_path / "meeting.txt"
    txt.write_text("[10:30] 我: hello", encoding="utf-8")

    with patch("speaksum.api.upload._has_celery_workers", return_value=False):
        with open(txt, "rb") as f:
            resp = authorized_client.post(
                "/api/v1/upload",
                data={"source_type": "meeting_minutes"},
                files={"file": ("meeting.txt", f, "text/plain")},
            )

    assert resp.status_code == 503
    assert "Celery" in resp.json()["detail"]


def test_upload_task_status(authorized_client: TestClient) -> None:
    # Test getting task status
    mock_result = MagicMock()
    mock_result.state = "SUCCESS"
    mock_result.info = {"stage": "completed", "percent": 100, "content_id": "test-content-id"}

    with patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result):
        resp = authorized_client.get("/api/v1/upload/task-123/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "SUCCESS"
        assert data["percent"] == 100


def test_upload_task_status_marks_missing_workers_as_failed(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "PENDING"
    mock_result.info = None

    with (
        patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result),
        patch("speaksum.api.upload._has_celery_workers", return_value=False),
    ):
        resp = authorized_client.get("/api/v1/upload/task-123/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "FAILED"
    assert "Celery" in data["error_message"]


def test_upload_task_status_maps_queue_retry_to_pending_queue_state(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "RETRY"
    mock_result.info = RuntimeError("前序文件处理中，当前文件排队等待中。")

    with patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result):
        resp = authorized_client.get("/api/v1/upload/task-queued/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PENDING"
    assert data["stage"] == "queued"
    assert data["percent"] == 0
    assert data["message"] == "前序文件处理中，当前文件排队等待中。"


def test_upload_task_status_handles_non_dict_task_info(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "RETRY"
    mock_result.info = RuntimeError("temporary failure")

    with patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result):
        resp = authorized_client.get("/api/v1/upload/task-123/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "RETRY"
    assert data["error_message"] == "temporary failure"


def test_upload_task_status_marks_orphaned_in_progress_task_as_failed(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "EXTRACTING_QUOTES"
    mock_result.info = {
        "stage": "extracting_quotes",
        "percent": 40,
        "message": "正在整理思想金句",
        "content_id": "content-123",
    }

    with (
        patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result),
        patch("speaksum.api.upload._has_celery_workers", return_value=True),
        patch("speaksum.api.upload._task_exists_on_workers", return_value=False),
    ):
        resp = authorized_client.get("/api/v1/upload/task-123/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "FAILED"
    assert data["content_id"] == "content-123"
    assert data["percent"] == 40
    assert "已中断" in data["error_message"]


def test_upload_task_status_keeps_active_in_progress_task(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "SUMMARIZING"
    mock_result.info = {
        "stage": "summarizing",
        "percent": 52,
        "message": "正在生成发言总结",
        "content_id": "content-123",
    }

    with (
        patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result),
        patch("speaksum.api.upload._has_celery_workers", return_value=True),
        patch("speaksum.api.upload._task_exists_on_workers", return_value=True),
    ):
        resp = authorized_client.get("/api/v1/upload/task-123/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUMMARIZING"
    assert data["percent"] == 52
    assert data["message"] == "正在生成发言总结"


def test_upload_task_status_supports_ignored_result(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "IGNORED"
    mock_result.info = {
        "stage": "ignored",
        "percent": 100,
        "message": "未检测到刘彬发言，因此未生成记录",
        "content_id": "content-ignored",
        "error": "未检测到刘彬发言，因此未生成记录",
    }

    with patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result):
        resp = authorized_client.get("/api/v1/upload/task-ignored/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "IGNORED"
    assert data["content_id"] == "content-ignored"
    assert data["message"] == "未检测到刘彬发言，因此未生成记录"
    assert data["error_message"] == "未检测到刘彬发言，因此未生成记录"


def test_upload_task_status_maps_success_result_to_completed_terminal_state(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "SUCCESS"
    mock_result.info = {
        "content_id": "content-completed",
        "status": "completed",
    }

    with patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result):
        resp = authorized_client.get("/api/v1/upload/task-completed/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["content_id"] == "content-completed"
    assert data["percent"] == 100
    assert data["stage"] == "completed"
    assert data["message"] == "处理完成"


def test_upload_task_status_maps_success_result_to_ignored_terminal_state(authorized_client: TestClient) -> None:
    mock_result = MagicMock()
    mock_result.state = "SUCCESS"
    mock_result.info = {
        "content_id": "content-ignored",
        "status": "ignored",
    }

    with patch("speaksum.api.upload.celery_app.AsyncResult", return_value=mock_result):
        resp = authorized_client.get("/api/v1/upload/task-ignored-terminal/status")

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ignored"
    assert data["content_id"] == "content-ignored"
    assert data["percent"] == 100
    assert data["stage"] == "ignored"
    assert data["message"] == "未检测到刘彬发言，因此未生成记录"
    assert data["error_message"] == "未检测到刘彬发言，因此未生成记录"
