"""Security utilities: JWT, password hashing, current user dependency."""

from datetime import datetime, timedelta, timezone
from typing import Any

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
