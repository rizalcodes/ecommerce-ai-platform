"""Catalog — Schema.md Sections 2.7 to 2.9.

Categories are admin-managed only (PRD.md 5.1 / Rules.md Section 6): there is no
seller-side write path to this table anywhere in the codebase, seed scripts included.
"""

from __future__ import annotations

import datetime as dt
import decimal
import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.engagement import Inquiry, ProductView
    from app.models.user import User


class ProductStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    # The admin who created it. Kept nullable so removing an admin account never
    # cascades into deleting catalog taxonomy.
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    created_by_user: Mapped[User | None] = relationship(
        back_populates="created_categories", foreign_keys=[created_by]
    )
    products: Mapped[list[Product]] = relationship(back_populates="category")

    def __repr__(self) -> str:
        return f"<Category {self.slug}>"


class Product(Base, TimestampMixin):
    __tablename__ = "products"
    __table_args__ = (
        # Schema.md 2.8 — supports the buyer filter/search paths and the
        # seller-scoped product list.
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_seller_id", "seller_id"),
        Index("ix_products_status", "status"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    seller_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[decimal.Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus, name="product_status", validate_strings=True),
        nullable=False,
        default=ProductStatus.active,
        server_default=ProductStatus.active.value,
    )

    seller: Mapped[User] = relationship(back_populates="products", foreign_keys=[seller_id])
    category: Mapped[Category] = relationship(back_populates="products")
    images: Mapped[list[ProductImage]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )
    views: Mapped[list[ProductView]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )
    inquiries: Mapped[list[Inquiry]] = relationship(back_populates="product")

    @property
    def main_image_url(self) -> str | None:
        for image in self.images:
            if image.is_main:
                return image.url
        return self.images[0].url if self.images else None

    def __repr__(self) -> str:
        return f"<Product {self.slug}>"


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = uuid_pk()
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_main: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    product: Mapped[Product] = relationship(back_populates="images")

    def __repr__(self) -> str:
        return f"<ProductImage {self.url}>"
