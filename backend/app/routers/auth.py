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
from app.schemas.user import AccountUpdate, UserRead

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


@router.patch("/me", response_model=UserRead)
def update_me(payload: AccountUpdate, user: CurrentUser, db: DbSession) -> UserRead:
    """Update the signed-in account and, for sellers, its storefront profile.

    Scoped to the caller by construction — the user comes from the verified JWT,
    so there is no id in the payload that could point somewhere else.
    """
    data = payload.model_dump(exclude_unset=True)

    for field in ("name", "phone"):
        if field in data and data[field] is not None:
            setattr(user, field, data[field])

    profile_fields = {
        key: value
        for key, value in data.items()
        if key in {"store_name", "store_description", "whatsapp_number", "avatar_url"}
    }
    if profile_fields:
        if user.seller_profile is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This account has no storefront to update",
            )
        for key, value in profile_fields.items():
            # store_name is NOT NULL, so an explicit null is rejected rather than
            # written; the other fields are nullable and may be cleared.
            if key == "store_name" and not value:
                continue
            setattr(user.seller_profile, key, value)

    db.commit()
    db.refresh(user)
    return UserRead.from_user(user)
