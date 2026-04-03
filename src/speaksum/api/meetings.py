"""Meeting management API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting
from speaksum.schemas.schemas import MeetingList, MeetingResponse

router = APIRouter(prefix="/api/v1/meetings", tags=["Meetings"])


@router.get("")
async def list_meetings(
    q: str | None = Query(None, description="Search query"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> MeetingList:
    user_id = current_user.get("sub", "")
    base_stmt = select(Meeting).where(Meeting.user_id == user_id).order_by(Meeting.created_at.desc())

    count_stmt = select(func.count(Meeting.id)).where(Meeting.user_id == user_id)

    if q:
        count_stmt = count_stmt.where(Meeting.title.ilike(f"%{q}%"))
        base_stmt = base_stmt.where(Meeting.title.ilike(f"%{q}%"))

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    offset = (page - 1) * size
    result = await db.execute(base_stmt.offset(offset).limit(size).options(selectinload(Meeting.speeches)))
    meetings = result.scalars().all()

    items = []
    for m in meetings:
        mr = MeetingResponse.model_validate(m)
        items.append(mr)

    return MeetingList(total=total, items=items)


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
    return MeetingResponse.model_validate(meeting)


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
