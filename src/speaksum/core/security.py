"""Security utilities: JWT, password hashing, key encryption, current user dependency."""

import base64
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from speaksum.core.config import settings

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    # bcrypt has a 72-byte limit, truncate explicitly
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    # bcrypt has a 72-byte limit, truncate explicitly
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    encoded: str = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded


def verify_token(token: str) -> dict[str, Any]:
    try:
        payload: dict[str, Any] = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


async def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme)) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return verify_token(credentials.credentials)


def _get_encryption_key(version: int = 1) -> bytes | None:
    """Get encryption key for the specified version.

    Currently supports only version 1 (current key from settings).
    Future versions can implement key rotation by storing multiple keys.
    """
    key = settings.ENCRYPTION_KEY
    if not key:
        return None
    # Decode base64 key or use raw key padded to 32 bytes
    try:
        raw = base64.b64decode(key)
        if len(raw) >= 32:
            return raw[:32]
    except Exception:
        raw = key.encode()
    return raw[:32].ljust(32, b"0")[:32]


def encrypt_key(plain: str | None) -> tuple[str | None, int]:
    """Encrypt API key using AES-256-GCM.

    Returns:
        Tuple of (encrypted_base64, encryption_version)
    """
    if not plain:
        return None, 1

    key = _get_encryption_key(version=1)
    if key is None:
        # No encryption key configured, return plaintext with version 0
        return plain, 0

    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, plain.encode(), None)
    # Combine nonce + ciphertext and encode as base64
    encrypted = base64.b64encode(nonce + ciphertext).decode()
    return encrypted, 1


def decrypt_key(encrypted: str | None, version: int = 1) -> str | None:
    """Decrypt API key using AES-256-GCM.

    Args:
        encrypted: Base64 encoded encrypted key (nonce + ciphertext)
        version: Encryption version used for this key
    """
    if not encrypted:
        return None

    # Version 0 means plaintext (no encryption)
    if version == 0:
        return encrypted

    key = _get_encryption_key(version=version)
    if key is None:
        # No encryption key configured, assume plaintext
        return encrypted

    try:
        data = base64.b64decode(encrypted)
        nonce, ciphertext = data[:12], data[12:]
        aesgcm = AESGCM(key)
        decrypted = aesgcm.decrypt(nonce, ciphertext, None).decode()
        return decrypted
    except Exception as e:
        # Decryption failed, log error and return as-is (may be legacy encrypted)
        logger.warning(f"Failed to decrypt key (version={version}): {type(e).__name__}: {e}")
        return encrypted
