"""Auth routes — Architecture.md Section 3."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.permissions import CurrentUser
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Role, SellerProfile, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]


def _issue_token(user: User) -> TokenResponse:
    # v1 users hold exactly one role; sorted() keeps the claim deterministic if
    # that ever changes.
    role = sorted(user.role_names)[0] if user.role_names else "seller"
    token, expires_in = create_access_token(user.id, role)
    return TokenResponse(access_token=token, expires_in=expires_in, user=UserRead.from_user(user))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    seller_role = db.scalar(select(Role).where(Role.name == "seller"))
    if seller_role is None:
        # The RBAC baseline migration has not run against this database.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Roles are not configured",
        )

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        phone=payload.phone,
    )
    user.roles.append(seller_role)
    user.seller_profile = SellerProfile(
        store_name=payload.store_name,
        whatsapp_number=payload.whatsapp_number,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_token(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))

    # Same response for unknown email and wrong password, so the endpoint cannot
    # be used to enumerate registered accounts.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    return _issue_token(user)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> UserRead:
    return UserRead.from_user(user)
