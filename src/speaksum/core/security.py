"""Security utilities: JWT, password hashing, key encryption, current user dependency."""

import base64
from datetime import datetime, timedelta, timezone
from typing import Any

from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from speaksum.core.config import settings

security_scheme = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)  # type: ignore[no-any-return]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)  # type: ignore[no-any-return]


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


def _get_fernet() -> Fernet | None:
    key = settings.ENCRYPTION_KEY
    if not key:
        return None
    raw = key.encode()[:32].ljust(32, b"0")[:32]
    fernet_key = base64.urlsafe_b64encode(raw)
    return Fernet(fernet_key)


def encrypt_key(plain: str | None) -> str | None:
    if not plain:
        return None
    f = _get_fernet()
    if f is None:
        return plain
    encrypted: str = f.encrypt(plain.encode()).decode()
    return encrypted


def decrypt_key(encrypted: str | None) -> str | None:
    if not encrypted:
        return None
    f = _get_fernet()
    if f is None:
        return encrypted
    try:
        decrypted: str = f.decrypt(encrypted.encode()).decode()
        return decrypted
    except Exception:
        return encrypted
