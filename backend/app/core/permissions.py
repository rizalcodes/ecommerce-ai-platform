"""RBAC dependencies.

Rules.md Section 3: authorization is always derived from the verified JWT.
A role or user_id arriving in a request body is data, never a permission.
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

# auto_error=False so a missing header produces our own 401 with a useful
# message rather than FastAPI's bare "Not authenticated".
_bearer = HTTPBearer(auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None or not credentials.credentials:
        raise CREDENTIALS_ERROR

    claims = decode_access_token(credentials.credentials)
    if claims is None:
        raise CREDENTIALS_ERROR

    try:
        user_id = uuid.UUID(claims["user_id"])
    except (KeyError, ValueError):
        raise CREDENTIALS_ERROR from None

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        # A token that outlived its account, or a deactivated account.
        raise CREDENTIALS_ERROR

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permission(permission: str):
    """Dependency factory: `Depends(require_permission("product:create"))`."""

    def dependency(user: CurrentUser) -> User:
        if permission not in user.permission_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission}",
            )
        return user

    return dependency


def require_role(role: str):
    """Use only where a whole area is role-gated (e.g. the admin dashboard).
    Prefer require_permission for specific actions."""

    def dependency(user: CurrentUser) -> User:
        if role not in user.role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {role}",
            )
        return user

    return dependency


SellerUser = Annotated[User, Depends(require_role("seller"))]
AdminUser = Annotated[User, Depends(require_role("admin"))]
