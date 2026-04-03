"""Upload and processing API."""

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.config import settings
from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting
from speaksum.schemas.schemas import ProcessingStatus
from speaksum.tasks.celery_app import app as celery_app

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def upload_file(
    file: UploadFile = File(...),
    speaker_identity: str = Form(""),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    if not speaker_identity:
        raise HTTPException(status_code=400, detail="speaker_identity is required")

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

    with open(file_path, "wb") as f:
        f.write(content)

    meeting = Meeting(
        user_id=user_id,
        title=file.filename or "未命名会议",
        source_file=str(file_path),
        file_size=len(content),
        status="pending",
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)

    task = celery_app.send_task(
        "speaksum.tasks.celery_tasks.process_meeting_task",
        args=[str(meeting.id), str(file_path), speaker_identity],
    )

    return {"task_id": task.id, "meeting_id": str(meeting.id), "status": "pending"}


@router.get("/{task_id}/status")
async def get_task_status(
    task_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ProcessingStatus:
    result = celery_app.AsyncResult(task_id)
    info = result.info or {}
    return ProcessingStatus(
        task_id=task_id,
        status=result.state,
        stage=info.get("stage"),
        percent=info.get("percent", 0),
        message=info.get("message"),
        meeting_id=info.get("meeting_id"),
        error_message=str(info.get("error")) if info.get("error") else None,
    )
