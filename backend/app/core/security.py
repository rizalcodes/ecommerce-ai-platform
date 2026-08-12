"""Password hashing and JWT issue/verify.

Architecture.md Section 7: passwords are bcrypt-hashed and never stored plain;
the JWT carries `user_id` and `role` and is verified on every protected request.
"""

import datetime as dt
import uuid
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = settings.jwt_algorithm

# bcrypt truncates at 72 bytes and raises on longer input in 4.x, so cap before
# hashing rather than letting a long passphrase 500 on registration.
_MAX_PASSWORD_BYTES = 72


def _truncate(password: str) -> bytes:
    return password.encode("utf-8")[:_MAX_PASSWORD_BYTES]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_truncate(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_truncate(password), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash in the database — treat as a failed login, never a 500.
        return False


def create_access_token(user_id: uuid.UUID, role: str) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    expires_in = settings.jwt_expire_minutes * 60
    now = dt.datetime.now(dt.timezone.utc)
    payload: dict[str, Any] = {
        "user_id": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + dt.timedelta(seconds=expires_in)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM), expires_in


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Returns the claims, or None if the token is invalid or expired."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
