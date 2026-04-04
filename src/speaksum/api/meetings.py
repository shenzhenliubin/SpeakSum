"""Meeting management API."""

import math
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting, Speech
from speaksum.schemas.schemas import MeetingList, MeetingResponse

router = APIRouter(prefix="/api/v1/meetings", tags=["Meetings"])


@router.get("")
async def list_meetings(
    q: str | None = Query(None, description="Search query"),
    status: str | None = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="page_size"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MeetingList:
    user_id = current_user.get("sub", "")
    base_stmt = select(Meeting).where(Meeting.user_id == user_id).order_by(Meeting.created_at.desc())

    count_stmt = select(func.count(Meeting.id)).where(Meeting.user_id == user_id)

    if q:
        count_stmt = count_stmt.where(Meeting.title.ilike(f"%{q}%"))
        base_stmt = base_stmt.where(Meeting.title.ilike(f"%{q}%"))

    if status:
        count_stmt = count_stmt.where(Meeting.status == status)
        base_stmt = base_stmt.where(Meeting.status == status)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(base_stmt.offset(offset).limit(page_size))
    meetings = result.scalars().all()

    # Batch fetch speech counts for all meetings in this page
    meeting_ids = [m.id for m in meetings]
    speech_count_map: dict[str, int] = {}
    if meeting_ids:
        counts_result = await db.execute(
            select(Speech.meeting_id, func.count(Speech.id))
            .where(Speech.meeting_id.in_(meeting_ids))
            .group_by(Speech.meeting_id)
        )
        speech_count_map = dict(counts_result.all())

    items = []
    for m in meetings:
        mr = MeetingResponse.model_validate({
            "id": m.id,
            "user_id": m.user_id,
            "title": m.title,
            "meeting_date": m.meeting_date,
            "duration_minutes": m.duration_minutes,
            "participants": m.participants,
            "source_file": m.source_file,
            "file_size": m.file_size,
            "status": m.status,
            "error_message": m.error_message,
            "speech_count": speech_count_map.get(m.id, 0),
            "created_at": m.created_at,
            "updated_at": m.updated_at,
        })
        items.append(mr)

    total_pages = math.ceil(total / page_size) if page_size else 1
    return MeetingList(total=total, page=page, page_size=page_size, total_pages=total_pages, items=items)


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MeetingResponse:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.user_id == user_id)
        .options(selectinload(Meeting.speeches))
    )
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    resp = MeetingResponse.model_validate(meeting)
    resp.speech_count = len(meeting.speeches) if meeting.speeches else 0
    return resp


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    user_id = current_user.get("sub", "")
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.user_id == user_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await db.delete(meeting)
    await db.commit()
