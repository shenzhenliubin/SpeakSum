"""Upload and processing API."""

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.config import settings
from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Content
from speaksum.schemas.schemas import ProcessingStatus
from speaksum.tasks.celery_app import app as celery_app

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])
CELERY_WORKER_UNAVAILABLE_MESSAGE = "Celery 工作进程不可用，请先启动 worker 后再上传。"
STALE_TASK_MESSAGE = "处理任务已中断，请重新上传文件后重试。"
PROCESSING_QUEUE_WAIT_MESSAGE = "前序文件处理中，当前文件排队等待中。"
IN_PROGRESS_STATES = {
    "PENDING",
    "RETRY",
    "RECEIVED",
    "STARTED",
    "PARSING",
    "SUMMARIZING",
    "EXTRACTING_QUOTES",
    "EXTRACTING",
    "CLEANING",
    "TAGGING",
    "BUILDING_GRAPH",
}
TERMINAL_RESULT_STATUSES = {"completed", "ignored", "failed"}


def _build_terminal_status_from_result(task_id: str, info: dict[str, Any], error_message: str | None) -> ProcessingStatus | None:
    result_status = str(info.get("status") or "").strip().lower()
    if result_status not in TERMINAL_RESULT_STATUSES:
        return None

    if result_status == "completed":
        stage = "completed"
        message = str(info.get("message") or "处理完成")
        resolved_error = None
    elif result_status == "ignored":
        stage = "ignored"
        message = str(info.get("message") or info.get("error") or "未检测到刘彬发言，因此未生成记录")
        resolved_error = str(info.get("error") or message)
    else:
        stage = "error"
        message = str(info.get("message") or error_message or "处理失败")
        resolved_error = str(info.get("error") or error_message or message)

    return ProcessingStatus(
        task_id=task_id,
        status=result_status,
        stage=str(info.get("stage") or stage),
        percent=int(info.get("percent") or 100),
        message=message,
        content_id=info.get("content_id"),
        meeting_id=info.get("meeting_id"),
        error_message=resolved_error,
    )


def _get_celery_inspector():
    try:
        return celery_app.control.inspect(timeout=1.0)
    except Exception:
        return None


def _has_celery_workers(inspector: Any | None = None) -> bool:
    """Return True when at least one Celery worker responds to ping."""
    inspector = inspector or _get_celery_inspector()
    if inspector is None:
        return False
    try:
        return bool(inspector.ping())
    except Exception:
        return False


def _task_exists_on_workers(task_id: str, inspector: Any | None = None) -> bool:
    inspector = inspector or _get_celery_inspector()
    if inspector is None:
        return False

    for method_name in ("active", "reserved", "scheduled"):
        try:
            snapshot = getattr(inspector, method_name)()
        except Exception:
            continue

        if not isinstance(snapshot, dict):
            continue

        for worker_tasks in snapshot.values():
            if not isinstance(worker_tasks, list):
                continue

            for task in worker_tasks:
                if not isinstance(task, dict):
                    continue
                candidate_id = task.get("id")
                if candidate_id is None and isinstance(task.get("request"), dict):
                    candidate_id = task["request"].get("id")
                if candidate_id == task_id:
                    return True

    return False


def _build_processing_status(task_id: str) -> ProcessingStatus:
    result = celery_app.AsyncResult(task_id)
    raw_info = result.info
    info = raw_info if isinstance(raw_info, dict) else {}
    error_message = None
    if isinstance(raw_info, dict):
        error = raw_info.get("error")
        error_message = str(error) if error else None
    elif raw_info:
        error_message = str(raw_info)

    if result.state == "RETRY" and error_message == PROCESSING_QUEUE_WAIT_MESSAGE:
        return ProcessingStatus(
            task_id=task_id,
            status="PENDING",
            stage="queued",
            percent=0,
            message=PROCESSING_QUEUE_WAIT_MESSAGE,
        )

    if result.state == "SUCCESS" and info:
        terminal_status = _build_terminal_status_from_result(task_id, info, error_message)
        if terminal_status is not None:
            return terminal_status

    inspector = _get_celery_inspector()
    has_workers = _has_celery_workers(inspector)

    if result.state == "PENDING" and not info and not has_workers:
        return ProcessingStatus(
            task_id=task_id,
            status="FAILED",
            stage="error",
            percent=0,
            message=CELERY_WORKER_UNAVAILABLE_MESSAGE,
            error_message=CELERY_WORKER_UNAVAILABLE_MESSAGE,
        )

    if result.state in IN_PROGRESS_STATES and info and (
        not has_workers or not _task_exists_on_workers(task_id, inspector)
    ):
        return ProcessingStatus(
            task_id=task_id,
            status="FAILED",
            stage="error",
            percent=info.get("percent", 0),
            message=STALE_TASK_MESSAGE,
            content_id=info.get("content_id"),
            meeting_id=info.get("meeting_id"),
            error_message=STALE_TASK_MESSAGE,
        )

    return ProcessingStatus(
        task_id=task_id,
        status=result.state,
        stage=info.get("stage"),
        percent=info.get("percent", 0),
        message=info.get("message") or error_message,
        content_id=info.get("content_id"),
        meeting_id=info.get("meeting_id"),
        error_message=error_message,
    )


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    file: UploadFile = File(...),
    source_type: str = Form("meeting_minutes"),
    provider: str = Form(""),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    if source_type not in {"meeting_minutes", "other_text"}:
        raise HTTPException(status_code=400, detail="source_type must be meeting_minutes or other_text")

    # Normalize provider (default to kimi if not provided)
    if not provider or provider == "default":
        provider = "kimi"

    user_id = current_user.get("sub", "")
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "txt").suffix.lower()
    if ext not in {".txt", ".md", ".doc", ".docx"}:
        raise HTTPException(status_code=400, detail="Unsupported file format")

    file_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / file_name

    # The 10MB limit makes an in-memory read acceptable.
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    if not _has_celery_workers():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=CELERY_WORKER_UNAVAILABLE_MESSAGE,
        )

    with open(file_path, "wb") as f:
        f.write(content)

    content_record = Content(
        user_id=user_id,
        title=file.filename or "未命名会议",
        source_type=source_type,
        source_file_name=file.filename or file_name,
        source_file_path=str(file_path),
        source_file_size=len(content),
        file_type=ext.lstrip("."),
        status="pending",
    )
    db.add(content_record)
    await db.commit()
    await db.refresh(content_record)

    task = celery_app.send_task(
        "speaksum.tasks.celery_tasks.process_content_task",
        args=[str(content_record.id), str(file_path), source_type, provider],
    )

    return {"task_id": task.id, "content_id": str(content_record.id), "status": "pending"}


@router.get("/{task_id}/status")
async def get_task_status(
    task_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ProcessingStatus:
    return _build_processing_status(task_id)
