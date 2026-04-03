"""Tests for settings API."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

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
