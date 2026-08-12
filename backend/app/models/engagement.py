"""Demand and engagement signals — Schema.md Sections 2.10 to 2.12.

With no cart or checkout in v1 there is no sales data, so every dashboard metric
comes from these three tables: product views, inquiries, notifications
(PRD.md Section 5.5).
"""

from __future__ import annotations

import datetime as dt
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.catalog import Product
    from app.models.user import User


class InquiryStatus(str, enum.Enum):
    """Lifecycle from PRD.md 5.3. Rules.md Section 6 forbids extra statuses
    without updating Schema.md and both dashboards."""

    new = "new"
    contacted = "contacted"
    closed = "closed"


class ProductView(Base):
    """One row per product detail page load.

    A log table rather than a counter column so the admin dashboard can bucket
    views by week for its market-trends chart (Schema.md 2.10).
    """

    __tablename__ = "product_views"
    __table_args__ = (
        # Serves both "most viewed product" and time-bucketed trend queries.
        Index("ix_product_views_product_id_viewed_at", "product_id", "viewed_at"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    viewed_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    product: Mapped[Product] = relationship(back_populates="views")


class Inquiry(Base, TimestampMixin):
    """Buyer -> seller contact. The v1 conversion path in place of cart/checkout."""

    __tablename__ = "inquiries"
    __table_args__ = (
        # Serves the seller dashboard's inquiry breakdown by status.
        Index("ix_inquiries_seller_id_status", "seller_id", "status"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    # Denormalised from products.seller_id so dashboard queries do not need a join
    # (Schema.md 2.11). Writes must always derive it from the product, never from
    # client input.
    seller_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    buyer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    buyer_contact: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[InquiryStatus] = mapped_column(
        Enum(InquiryStatus, name="inquiry_status", validate_strings=True),
        nullable=False,
        default=InquiryStatus.new,
        server_default=InquiryStatus.new.value,
    )

    product: Mapped[Product] = relationship(back_populates="inquiries")
    seller: Mapped[User] = relationship(back_populates="inquiries", foreign_keys=[seller_id])

    def __repr__(self) -> str:
        return f"<Inquiry {self.id} {self.status.value}>"


class Notification(Base):
    """In-app notification for a seller, written alongside the Resend email."""

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification {self.type}>"
