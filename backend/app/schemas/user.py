"""User and seller-profile response schemas."""

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SellerProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store_name: str
    store_description: str | None = None
    whatsapp_number: str | None = None
    avatar_url: str | None = None


class SellerProfileUpdate(BaseModel):
    store_name: str | None = Field(default=None, min_length=2, max_length=150)
    store_description: str | None = Field(default=None, max_length=2000)
    whatsapp_number: str | None = Field(default=None, max_length=30)
    avatar_url: str | None = Field(default=None, max_length=500)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    name: str
    phone: str | None = None
    is_active: bool
    roles: list[str]
    seller_profile: SellerProfileRead | None = None

    @classmethod
    def from_user(cls, user) -> "UserRead":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            phone=user.phone,
            is_active=user.is_active,
            roles=sorted(user.role_names),
            seller_profile=(
                SellerProfileRead.model_validate(user.seller_profile)
                if user.seller_profile
                else None
            ),
        )


class UserSummary(BaseModel):
    """Public seller identity shown on storefront pages."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    store_name: str | None = None
    avatar_url: str | None = None
    # Public on purpose: it powers the WhatsApp quick-contact shortcut on the
    # product page (PRD.md 5.3). Nothing else from the account is exposed here.
    whatsapp_number: str | None = None


class SellerPublic(BaseModel):
    """Storefront profile for /sellers/[id]."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    store_name: str
    store_description: str | None = None
    whatsapp_number: str | None = None
    avatar_url: str | None = None
    joined_at: dt.datetime
    product_count: int
