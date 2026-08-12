"""Accounts — Schema.md Sections 2.1 and 2.6.

Only Sellers and Admins have accounts. Buyers are unauthenticated in v1
(PRD.md Section 4), so there is no buyer table anywhere in this schema.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk
from app.models.rbac import user_roles

if TYPE_CHECKING:
    from app.models.catalog import Category, Product
    from app.models.engagement import Inquiry, Notification
    from app.models.rbac import Role


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    roles: Mapped[list[Role]] = relationship(
        secondary=user_roles,
        back_populates="users",
        lazy="selectin",
    )
    seller_profile: Mapped[SellerProfile | None] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    products: Mapped[list[Product]] = relationship(
        back_populates="seller",
        foreign_keys="Product.seller_id",
    )
    inquiries: Mapped[list[Inquiry]] = relationship(
        back_populates="seller",
        foreign_keys="Inquiry.seller_id",
    )
    notifications: Mapped[list[Notification]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    created_categories: Mapped[list[Category]] = relationship(
        back_populates="created_by_user",
        foreign_keys="Category.created_by",
    )

    @property
    def permission_names(self) -> set[str]:
        """Flattened permission set, used by the RBAC dependency in M3."""
        return {perm.name for role in self.roles for perm in role.permissions}

    @property
    def role_names(self) -> set[str]:
        return {role.name for role in self.roles}

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class SellerProfile(Base):
    """1:1 storefront extension of `users` for seller-specific fields."""

    __tablename__ = "seller_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    store_name: Mapped[str] = mapped_column(String(150), nullable=False)
    store_description: Mapped[str | None] = mapped_column(Text)
    # Powers the WhatsApp quick-contact shortcut on the product page (PRD.md 5.3).
    whatsapp_number: Mapped[str | None] = mapped_column(String(30))
    avatar_url: Mapped[str | None] = mapped_column(String(500))

    user: Mapped[User] = relationship(back_populates="seller_profile")

    def __repr__(self) -> str:
        return f"<SellerProfile {self.store_name}>"
