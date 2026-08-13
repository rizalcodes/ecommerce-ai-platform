"""Product schemas."""

import datetime as dt
import decimal
import enum
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models import ProductStatus
from app.schemas.category import CategoryRead
from app.schemas.user import UserSummary


class ProductSort(str, enum.Enum):
    """Sort options from PRD.md 5.2 (newest / price)."""

    newest = "newest"
    price_asc = "price_asc"
    price_desc = "price_desc"


class ProductImageIn(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    is_main: bool = False
    sort_order: int = 0


class ProductImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    is_main: bool
    sort_order: int


class ProductListItem(BaseModel):
    """Grid card payload — deliberately lighter than ProductRead."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    price: decimal.Decimal
    stock: int
    status: ProductStatus
    created_at: dt.datetime
    main_image_url: str | None = None
    category: CategoryRead
    seller: UserSummary

    @classmethod
    def from_product(cls, product) -> "ProductListItem":
        profile = product.seller.seller_profile if product.seller else None
        return cls(
            id=product.id,
            name=product.name,
            slug=product.slug,
            price=product.price,
            stock=product.stock,
            status=product.status,
            created_at=product.created_at,
            main_image_url=product.main_image_url,
            category=CategoryRead.model_validate(product.category),
            seller=UserSummary(
                id=product.seller.id,
                name=product.seller.name,
                store_name=profile.store_name if profile else None,
                avatar_url=profile.avatar_url if profile else None,
                whatsapp_number=profile.whatsapp_number if profile else None,
            ),
        )


class ProductRead(ProductListItem):
    """Detail payload for /products/[id]."""

    description: str | None = None
    updated_at: dt.datetime
    images: list[ProductImageRead] = []

    @classmethod
    def from_product(cls, product) -> "ProductRead":
        return cls(
            **ProductListItem.from_product(product).model_dump(),
            description=product.description,
            updated_at=product.updated_at,
            images=[ProductImageRead.model_validate(i) for i in product.images],
        )


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    category_id: uuid.UUID
    description: str | None = Field(default=None, max_length=5000)
    price: decimal.Decimal = Field(ge=0, decimal_places=2, max_digits=12)
    stock: int = Field(default=0, ge=0)
    status: ProductStatus = ProductStatus.active
    images: list[ProductImageIn] = []


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    category_id: uuid.UUID | None = None
    description: str | None = Field(default=None, max_length=5000)
    price: decimal.Decimal | None = Field(default=None, ge=0, decimal_places=2, max_digits=12)
    stock: int | None = Field(default=None, ge=0)
    status: ProductStatus | None = None
    # When present, replaces the whole image set; when omitted, images are left
    # untouched. An explicit empty list therefore clears them.
    images: list[ProductImageIn] | None = None
