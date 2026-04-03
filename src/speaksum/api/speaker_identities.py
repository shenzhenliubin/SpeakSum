"""Speaker identity management API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.security import get_current_user
from speaksum.models.models import SpeakerIdentity
from speaksum.schemas.schemas import ApiResponse, SpeakerIdentityCreate, SpeakerIdentityResponse

router = APIRouter(prefix="/api/v1/speaker-identities", tags=["Speaker Identities"])


@router.get("")
async def list_speaker_identities(
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[list[SpeakerIdentityResponse]]:
    """List all speaker identities for the current user."""
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(SpeakerIdentity)
        .where(SpeakerIdentity.user_id == user_id)
        .order_by(SpeakerIdentity.created_at)
    )
    identities = result.scalars().all()
    return ApiResponse.success_response(
        [SpeakerIdentityResponse.model_validate(i) for i in identities]
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_speaker_identity(
    payload: SpeakerIdentityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[SpeakerIdentityResponse]:
    """Create a new speaker identity."""
    user_id = current_user.get("sub", "")

    identity = SpeakerIdentity(
        user_id=user_id,
        display_name=payload.display_name,
        aliases=payload.aliases,
        color=payload.color,
        avatar_url=payload.avatar_url,
    )
    db.add(identity)
    await db.commit()
    await db.refresh(identity)

    return ApiResponse.success_response(SpeakerIdentityResponse.model_validate(identity))


@router.get("/{identity_id}")
async def get_speaker_identity(
    identity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[SpeakerIdentityResponse]:
    """Get a specific speaker identity by ID."""
    user_id = current_user.get("sub", "")

    result = await db.execute(
        select(SpeakerIdentity).where(
            SpeakerIdentity.id == identity_id,
            SpeakerIdentity.user_id == user_id,
        )
    )
    identity = result.scalar_one_or_none()

    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaker identity not found")

    return ApiResponse.success_response(SpeakerIdentityResponse.model_validate(identity))


@router.put("/{identity_id}")
async def update_speaker_identity(
    identity_id: str,
    payload: SpeakerIdentityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ApiResponse[SpeakerIdentityResponse]:
    """Update a speaker identity."""
    user_id = current_user.get("sub", "")

    result = await db.execute(
        select(SpeakerIdentity).where(
            SpeakerIdentity.id == identity_id,
            SpeakerIdentity.user_id == user_id,
        )
    )
    identity = result.scalar_one_or_none()

    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaker identity not found")

    identity.display_name = payload.display_name
    identity.aliases = payload.aliases
    identity.color = payload.color
    identity.avatar_url = payload.avatar_url

    await db.commit()
    await db.refresh(identity)

    return ApiResponse.success_response(SpeakerIdentityResponse.model_validate(identity))


@router.delete("/{identity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_speaker_identity(
    identity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    """Delete a speaker identity."""
    user_id = current_user.get("sub", "")

    result = await db.execute(
        select(SpeakerIdentity).where(
            SpeakerIdentity.id == identity_id,
            SpeakerIdentity.user_id == user_id,
        )
    )
    identity = result.scalar_one_or_none()

    if not identity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Speaker identity not found")

    await db.delete(identity)
    await db.commit()
