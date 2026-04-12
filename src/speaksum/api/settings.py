"""User settings API."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.database import get_db
from speaksum.core.exceptions import SpeakSumException
from speaksum.core.security import encrypt_key, get_current_user
from speaksum.models.models import UserModelConfig
from speaksum.schemas.schemas import (
    ModelConfigCreate,
    ModelConfigResponse,
    ModelConfigTestRequest,
    ModelConfigTestResponse,
)
from speaksum.services.llm_client import get_llm_client

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])
BUILTIN_MODEL_PROVIDERS = {"kimi", "siliconflow", "openai", "claude", "ollama"}


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
            base_url=None if payload.provider in BUILTIN_MODEL_PROVIDERS else payload.base_url,
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


@router.post("/model/test")
async def test_model_config(
    payload: ModelConfigTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> ModelConfigTestResponse:
    user_id = current_user.get("sub", "")
    stored_config: UserModelConfig | None = None

    if payload.config_id:
        result = await db.execute(
            select(UserModelConfig).where(
                UserModelConfig.id == payload.config_id,
                UserModelConfig.user_id == user_id,
            )
        )
        stored_config = result.scalar_one_or_none()

    resolved_api_key = payload.api_key
    normalized_base_url = None if payload.provider in BUILTIN_MODEL_PROVIDERS else payload.base_url

    if not resolved_api_key and stored_config:
        if stored_config.provider != payload.provider:
            raise HTTPException(status_code=400, detail="已修改提供商，请重新输入 API Key 后再测试连接。")
        resolved_api_key = stored_config.api_key
        if normalized_base_url is None:
            normalized_base_url = stored_config.base_url

    if not resolved_api_key:
        raise HTTPException(status_code=400, detail="请先输入 API Key 后再测试连接。")

    try:
        client = get_llm_client(
            provider=payload.provider,
            api_key=resolved_api_key,
            base_url=normalized_base_url,
            model=payload.default_model,
        )
        await client.generate(
            [{"role": "user", "content": "Reply with OK only."}],
            temperature=0,
            max_tokens=8,
        )
    except SpeakSumException as exc:
        status_code = 400 if exc.status_code in {401, 403} else exc.status_code
        raise HTTPException(status_code=status_code, detail=exc.message) from exc
    except Exception as exc:  # pragma: no cover - integration path
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return ModelConfigTestResponse(
        success=True,
        message="连接成功",
        provider=payload.provider,
        model=payload.default_model,
    )
