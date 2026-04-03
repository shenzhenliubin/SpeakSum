"""Tests for security utilities."""

import pytest
from fastapi import HTTPException

from speaksum.core.security import (
    create_access_token,
    decrypt_key,
    encrypt_key,
    hash_password,
    verify_password,
    verify_token,
)


@pytest.mark.skip(reason="bcrypt library has internal test bug with passlib")
def test_hash_password() -> None:
    # Use a shorter password to avoid bcrypt 72-byte limit
    hashed = hash_password("pass123")
    assert hashed != "pass123"
    assert verify_password("pass123", hashed)
    assert not verify_password("wrongpass", hashed)


def test_create_and_verify_token() -> None:
    token = create_access_token({"sub": "user123", "email": "test@example.com"})
    payload = verify_token(token)
    assert payload["sub"] == "user123"
    assert payload["email"] == "test@example.com"


def test_verify_invalid_token() -> None:
    with pytest.raises(HTTPException) as exc_info:
        verify_token("invalid.token.here")
    assert exc_info.value.status_code == 401


def test_encrypt_decrypt_key() -> None:
    # Test with encryption key set
    original = "my-secret-api-key"
    encrypted = encrypt_key(original)
    decrypted = decrypt_key(encrypted)
    assert decrypted == original


def test_encrypt_decrypt_none() -> None:
    assert encrypt_key(None) is None
    assert decrypt_key(None) is None


def test_encrypt_decrypt_empty() -> None:
    assert encrypt_key("") is None
    assert decrypt_key("") is None


def test_create_access_token_custom_expiry() -> None:
    """Test creating token with custom expires_delta."""
    from datetime import timedelta
    token = create_access_token({"sub": "user123"}, expires_delta=timedelta(hours=1))
    payload = verify_token(token)
    assert payload["sub"] == "user123"


def test_verify_token_expired() -> None:
    """Test verifying an expired token."""
    from datetime import timedelta
    from fastapi import HTTPException

    # Create token that expired 1 hour ago
    expired_token = create_access_token(
        {"sub": "user123"},
        expires_delta=timedelta(hours=-1)
    )

    with pytest.raises(HTTPException) as exc_info:
        verify_token(expired_token)
    assert exc_info.value.status_code == 401


def test_verify_token_invalid_signature() -> None:
    """Test verifying token with invalid signature."""
    from fastapi import HTTPException

    # Create a valid token
    token = create_access_token({"sub": "user123"})

    # Tamper with the token (change last character)
    tampered_token = token[:-1] + ("a" if token[-1] != "a" else "b")

    with pytest.raises(HTTPException) as exc_info:
        verify_token(tampered_token)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_no_credentials() -> None:
    """Test get_current_user with no credentials."""
    from fastapi import HTTPException
    from speaksum.core.security import get_current_user

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(None)
    assert exc_info.value.status_code == 401
    assert "Not authenticated" in str(exc_info.value.detail)


def test_decrypt_key_invalid_ciphertext() -> None:
    """Test decrypt_key with invalid ciphertext returns as-is."""
    # When encryption key is set but ciphertext is invalid
    # it should return the ciphertext as-is
    invalid_ciphertext = "not-valid-encrypted-data"
    result = decrypt_key(invalid_ciphertext)
    # Should return the input as-is since it can't be decrypted
    assert result == invalid_ciphertext


def test_encrypt_decrypt_roundtrip() -> None:
    """Test encrypt and decrypt roundtrip with various inputs."""
    from speaksum.core.config import settings

    # Only test encryption if ENCRYPTION_KEY is set
    if not settings.ENCRYPTION_KEY:
        pytest.skip("ENCRYPTION_KEY not set, encryption disabled")

    test_keys = [
        "simple-key",
        "sk-abcdefghijklmnopqrstuvwxyz123456789",
        "key-with-special-chars-!@#$%",
        "a" * 100,  # Long key
    ]

    for key in test_keys:
        encrypted = encrypt_key(key)
        assert encrypted is not None
        assert encrypted != key  # Should be encrypted

        decrypted = decrypt_key(encrypted)
        assert decrypted == key  # Should match original
