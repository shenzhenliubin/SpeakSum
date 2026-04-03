"""User settings API."""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.security import encrypt_key, get_current_user
from speaksum.models.models import UserModelConfig
from speaksum.schemas.schemas import ModelConfigCreate, ModelConfigResponse

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])


@router.get("/model")
async def list_model_configs(
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ModelConfigResponse]:
    user_id = current_user.get("sub", "")
    result = await db.execute(
        select(UserModelConfig).where(UserModelConfig.user_id == user_id).order_by(UserModelConfig.created_at)
    )
    configs = result.scalars().all()
    return [ModelConfigResponse.model_validate(c) for c in configs]


@router.put("/model")
async def update_model_configs(
    payloads: list[ModelConfigCreate],
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[ModelConfigResponse]:
    user_id = current_user.get("sub", "")
    existing_result = await db.execute(select(UserModelConfig).where(UserModelConfig.user_id == user_id))
    for existing in existing_result.scalars().all():
        await db.delete(existing)

    created: list[UserModelConfig] = []
    for payload in payloads:
        encrypted_key, enc_version = encrypt_key(payload.api_key)
        config = UserModelConfig(
            user_id=user_id,
            provider=payload.provider,
            name=payload.name,
            api_key_encrypted=encrypted_key,
            encryption_version=enc_version,
            base_url=payload.base_url,
            default_model=payload.default_model,
            is_default=payload.is_default,
            is_enabled=payload.is_enabled,
        )
        db.add(config)
        created.append(config)

    await db.commit()
    for c in created:
        await db.refresh(c)
    return [ModelConfigResponse.model_validate(c) for c in created]
