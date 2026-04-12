"""Tests for process streaming API."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from speaksum.schemas.schemas import ProcessingStatus


def test_process_stream_supports_query_token_auth(client: TestClient, test_token: str) -> None:
    snapshot = ProcessingStatus(
        task_id="task-123",
        status="SUCCESS",
        stage="completed",
        percent=100,
        meeting_id="meeting-123",
    )

    with patch("speaksum.api.process._build_processing_status", return_value=snapshot):
        with client.stream("GET", f"/api/v1/process/task-123/stream?token={test_token}") as resp:
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/event-stream")
            body = "".join(resp.iter_text())

    assert '"task_id":"task-123"' in body
    assert '"status":"SUCCESS"' in body
    assert '"meeting_id":"meeting-123"' in body


def test_process_stream_surfaces_missing_worker_error(client: TestClient, test_token: str) -> None:
    snapshot = ProcessingStatus(
        task_id="task-123",
        status="FAILED",
        stage="error",
        percent=0,
        error_message="Celery 工作进程不可用，请先启动 worker 后再上传。",
    )

    with patch("speaksum.api.process._build_processing_status", return_value=snapshot):
        with client.stream("GET", f"/api/v1/process/task-123/stream?token={test_token}") as resp:
            assert resp.status_code == 200
            body = "".join(resp.iter_text())

    assert '"status":"FAILED"' in body
    assert "Celery 工作进程不可用" in body
