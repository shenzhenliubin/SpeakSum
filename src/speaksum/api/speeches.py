"""Speech management API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import Meeting, Speech
from speaksum.schemas.schemas import SpeechResponse, SpeechUpdate

router = APIRouter(prefix="/api/v1", tags=["Speeches"])


@router.get("/meetings/{meeting_id}/speeches")
async def list_speeches(
    meeting_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[SpeechResponse]:
    user_id = current_user.get("sub", "")
    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.user_id == user_id)
    )
    meeting = meeting_result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    result = await db.execute(select(Speech).where(Speech.meeting_id == meeting_id).order_by(Speech.timestamp))
    speeches = result.scalars().all()
    return [SpeechResponse.model_validate(s) for s in speeches]


@router.get("/speeches/{speech_id}")
async def get_speech(
    speech_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SpeechResponse:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(Speech)
        .join(Meeting)
        .where(Speech.id == speech_id, Meeting.user_id == user_id)
    )
    speech = result.scalar_one_or_none()
    if not speech:
        raise HTTPException(status_code=404, detail="Speech not found")
    return SpeechResponse.model_validate(speech)


@router.patch("/speeches/{speech_id}")
async def update_speech(
    speech_id: str,
    payload: SpeechUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SpeechResponse:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(Speech)
        .join(Meeting)
        .where(Speech.id == speech_id, Meeting.user_id == user_id)
    )
    speech = result.scalar_one_or_none()
    if not speech:
        raise HTTPException(status_code=404, detail="Speech not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(speech, field, value)

    await db.commit()
    await db.refresh(speech)
    return SpeechResponse.model_validate(speech)
