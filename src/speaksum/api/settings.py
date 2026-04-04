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

    # Fetch existing configs to preserve api_key when not re-provided
    existing_result = await db.execute(select(UserModelConfig).where(UserModelConfig.user_id == user_id))
    existing_by_name = {c.name: c for c in existing_result.scalars().all()}

    # Delete existing configs
    for existing in existing_by_name.values():
        await db.delete(existing)

    created: list[UserModelConfig] = []
    for payload in payloads:
        if payload.api_key:
            # New key provided: encrypt and store
            encrypted_key, enc_version = encrypt_key(payload.api_key)
        else:
            # No new key: preserve existing encrypted key if available
            old = existing_by_name.get(payload.name)
            if old and old.api_key_encrypted:
                encrypted_key = old.api_key_encrypted
                enc_version = old.encryption_version
            else:
                encrypted_key = None
                enc_version = 1

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
