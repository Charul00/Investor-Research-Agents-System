from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from fastapi import status
from pwdlib import PasswordHash

from app.core.config import settings
from app.core.errors import api_error

ALGORITHM = "HS256"
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def _build_token(subject: str, expires_delta: timedelta, token_type: str) -> str:
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "exp": datetime.now(UTC) + expires_delta,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(subject: str) -> str:
    return _build_token(
        subject=subject,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
        token_type="access",
    )


def create_refresh_token(subject: str) -> str:
    return _build_token(
        subject=subject,
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
        token_type="refresh",
    )


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError as exc:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="invalid_authentication_token",
            message="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.get("type") != expected_type:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="invalid_token_type",
            message="Authentication token type is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload
