"""Tests for settings API."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from speaksum.core.exceptions import SpeakSumException
from speaksum.models.models import User, UserModelConfig


@pytest.fixture
async def sample_model_config(db_session: AsyncSession, test_user: User) -> UserModelConfig:
    config = UserModelConfig(
        user_id=test_user.id,
        provider="kimi",
        name="My Kimi Config",
        default_model="moonshot-v1-128k",
        is_default=True,
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)
    return config


def test_list_model_configs(authorized_client: TestClient, sample_model_config: UserModelConfig) -> None:
    resp = authorized_client.get("/api/v1/settings/model")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert any(c["name"] == "My Kimi Config" for c in data)


def test_update_model_configs(authorized_client: TestClient) -> None:
    resp = authorized_client.put(
        "/api/v1/settings/model",
        json=[
            {
                "provider": "openai",
                "name": "My OpenAI Config",
                "api_key": "test-key",
                "default_model": "gpt-4",
                "is_default": True,
                "is_enabled": True,
            }
        ]
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["provider"] == "openai"
    assert data[0]["name"] == "My OpenAI Config"
    # API key should be encrypted and not returned
    assert "api_key" not in data[0]


def test_update_model_configs_multiple(authorized_client: TestClient) -> None:
    """Test updating multiple model configs at once."""
    resp = authorized_client.put(
        "/api/v1/settings/model",
        json=[
            {
                "provider": "kimi",
                "name": "Kimi Config",
                "default_model": "moonshot-v1-128k",
                "is_default": True,
                "is_enabled": True,
            },
            {
                "provider": "openai",
                "name": "OpenAI Config",
                "default_model": "gpt-4",
                "is_default": False,
                "is_enabled": True,
            }
        ]
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_list_model_configs_empty(authorized_client: TestClient) -> None:
    """Test listing model configs when none exist."""
    # First clear all configs
    authorized_client.put("/api/v1/settings/model", json=[])

    resp = authorized_client.get("/api/v1/settings/model")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 0


def test_update_model_configs_empty_list(authorized_client: TestClient) -> None:
    """Test PUT /model with empty list deletes all configs."""
    # First add a config
    authorized_client.put(
        "/api/v1/settings/model",
        json=[{"provider": "openai", "name": "Test", "default_model": "gpt-4", "is_default": True, "is_enabled": True}]
    )

    # Now delete all with empty list
    resp = authorized_client.put("/api/v1/settings/model", json=[])
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 0

    # Verify by listing
    resp = authorized_client.get("/api/v1/settings/model")
    assert resp.json() == []


def test_update_model_configs_api_key_encrypted(authorized_client: TestClient) -> None:
    """Test that api_key is encrypted when stored."""
    resp = authorized_client.put(
        "/api/v1/settings/model",
        json=[{
            "provider": "openai",
            "name": "My Config",
            "api_key": "sk-secret-key-12345",
            "default_model": "gpt-4",
            "is_default": True,
            "is_enabled": True,
        }]
    )
    assert resp.status_code == 200
    data = resp.json()
    # API key should not be returned in response
    assert "api_key" not in data[0]
    # Verify other fields are present
    assert data[0]["provider"] == "openai"
    assert data[0]["name"] == "My Config"


def test_update_builtin_model_configs_normalizes_base_url(authorized_client: TestClient) -> None:
    """Built-in providers should use server defaults instead of user-entered base_url."""
    resp = authorized_client.put(
        "/api/v1/settings/model",
        json=[{
            "provider": "kimi",
            "name": "Kimi Config",
            "api_key": "sk-secret-key-12345",
            "base_url": "https://api.kimi.com/coding/",
            "default_model": "moonshot-v1-128k",
            "is_default": True,
            "is_enabled": True,
        }]
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["base_url"] is None


def test_update_siliconflow_model_config_normalizes_base_url(authorized_client: TestClient) -> None:
    resp = authorized_client.put(
        "/api/v1/settings/model",
        json=[{
            "provider": "siliconflow",
            "name": "SiliconFlow Config",
            "api_key": "sk-secret-key-12345",
            "base_url": "https://api.example.com/v1",
            "default_model": "deepseek-ai/DeepSeek-V3",
            "is_default": True,
            "is_enabled": True,
        }]
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data[0]["provider"] == "siliconflow"
    assert data[0]["base_url"] is None


def test_test_model_config_success(authorized_client: TestClient) -> None:
    fake_client = AsyncMock()
    fake_client.generate = AsyncMock(return_value="OK")

    with patch("speaksum.api.settings.get_llm_client", return_value=fake_client) as mock_get_client:
        resp = authorized_client.post(
            "/api/v1/settings/model/test",
            json={
                "provider": "siliconflow",
                "api_key": "sk-test-123",
                "default_model": "deepseek-ai/DeepSeek-V3",
            },
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["provider"] == "siliconflow"
    assert data["model"] == "deepseek-ai/DeepSeek-V3"
    mock_get_client.assert_called_once_with(
        provider="siliconflow",
        api_key="sk-test-123",
        base_url=None,
        model="deepseek-ai/DeepSeek-V3",
    )
    fake_client.generate.assert_awaited_once()


def test_test_model_config_uses_stored_api_key(authorized_client: TestClient) -> None:
    save_resp = authorized_client.put(
        "/api/v1/settings/model",
        json=[{
            "provider": "siliconflow",
            "name": "SiliconFlow Config",
            "api_key": "sk-stored-123",
            "default_model": "deepseek-ai/DeepSeek-V3",
            "is_default": True,
            "is_enabled": True,
        }]
    )
    config_id = save_resp.json()[0]["id"]

    fake_client = AsyncMock()
    fake_client.generate = AsyncMock(return_value="OK")

    with patch("speaksum.api.settings.get_llm_client", return_value=fake_client) as mock_get_client:
        resp = authorized_client.post(
            "/api/v1/settings/model/test",
            json={
                "config_id": config_id,
                "provider": "siliconflow",
                "default_model": "deepseek-ai/DeepSeek-V3",
            },
        )

    assert resp.status_code == 200
    assert mock_get_client.call_args.kwargs["provider"] == "siliconflow"
    assert mock_get_client.call_args.kwargs["api_key"] == "sk-stored-123"
    assert mock_get_client.call_args.kwargs["base_url"] is None
    assert mock_get_client.call_args.kwargs["model"] == "deepseek-ai/DeepSeek-V3"


def test_test_model_config_maps_provider_auth_error_to_400(authorized_client: TestClient) -> None:
    fake_client = AsyncMock()
    fake_client.generate = AsyncMock()

    with patch("speaksum.api.settings.get_llm_client", return_value=fake_client):
        fake_client.generate.side_effect = SpeakSumException(
            "Kimi API Key 无效、已过期，或当前账号没有访问该模型的权限。",
            status_code=401,
        )
        resp = authorized_client.post(
            "/api/v1/settings/model/test",
            json={
                "provider": "kimi",
                "api_key": "sk-test-123",
                "default_model": "kimi-k2.5",
            },
        )

    assert resp.status_code == 400
    assert "Kimi API Key 无效" in resp.json()["detail"]
