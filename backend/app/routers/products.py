"""Product routes.

Buyer-facing reads are public and always scoped to active products. Writes are
seller-scoped: the owning seller is taken from the verified JWT and never from
the request body (Rules.md Section 3).
"""

import decimal
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from slugify import slugify
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import (
    AdminUser,
    SellerUser,
    require_permission,
)
from app.core.visibility import BUYER_VISIBLE
from app.db.session import get_db
from app.models import Category, Product, ProductImage, ProductStatus, User
from app.schemas.common import Page
from app.schemas.product import (
    ProductCreate,
    ProductListItem,
    ProductRead,
    ProductSort,
    ProductUpdate,
)
from app.services import view_tracking_service

router = APIRouter(prefix="/products", tags=["products"])

DbSession = Annotated[Session, Depends(get_db)]
ProductCreator = Annotated[User, Depends(require_permission("product:create"))]
ProductEditor = Annotated[User, Depends(require_permission("product:edit"))]
ProductDeleter = Annotated[User, Depends(require_permission("product:delete"))]

_EAGER = (
    selectinload(Product.images),
    selectinload(Product.category),
    selectinload(Product.seller).selectinload(User.seller_profile),
)


def _unique_slug(db: Session, base: str, exclude_id: uuid.UUID | None = None) -> str:
    slug = slugify(base)[:220] or "product"
    candidate = slug
    suffix = 2
    while True:
        stmt = select(Product.id).where(Product.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        if db.scalar(stmt) is None:
            return candidate
        candidate = f"{slug[:214]}-{suffix}"
        suffix += 1


def _apply_filters(
    stmt: Select,
    *,
    q: str | None,
    category: str | None,
    min_price: decimal.Decimal | None,
    max_price: decimal.Decimal | None,
    in_stock: bool | None,
    sort: ProductSort,
) -> Select:
    """Filters shared by the public, seller and admin listings (PRD.md 5.2)."""
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(pattern), Product.description.ilike(pattern)))

    if category:
        # Accept either a slug (storefront URLs) or an id (admin filter dropdown).
        try:
            stmt = stmt.where(Product.category_id == uuid.UUID(category))
        except ValueError:
            stmt = stmt.join(Category, Product.category_id == Category.id).where(
                Category.slug == category
            )

    if min_price is not None:
        stmt = stmt.where(Product.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if in_stock is not None:
        stmt = stmt.where(Product.stock > 0) if in_stock else stmt.where(Product.stock == 0)

    if sort is ProductSort.price_asc:
        return stmt.order_by(Product.price.asc(), Product.created_at.desc())
    if sort is ProductSort.price_desc:
        return stmt.order_by(Product.price.desc(), Product.created_at.desc())
    return stmt.order_by(Product.created_at.desc())


def _paginate(db: Session, stmt: Select, limit: int, offset: int) -> Page[ProductListItem]:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    products = db.scalars(stmt.options(*_EAGER).limit(limit).offset(offset)).unique().all()
    return Page[ProductListItem](
        items=[ProductListItem.from_product(p) for p in products], total=total, limit=limit, offset=offset
    )


# --- Literal paths are declared before /{product_id} so they are matched first ---


@router.get("", response_model=Page[ProductListItem])
def list_products(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=200, description="Free text over name and description")] = None,
    category: Annotated[str | None, Query(description="Category slug or id")] = None,
    seller_id: uuid.UUID | None = None,
    min_price: Annotated[decimal.Decimal | None, Query(ge=0)] = None,
    max_price: Annotated[decimal.Decimal | None, Query(ge=0)] = None,
    in_stock: bool | None = None,
    sort: ProductSort = ProductSort.newest,
    limit: Annotated[int, Query(ge=1, le=100)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProductListItem]:
    """Public catalogue. Inactive products, and the catalogues of suspended
    sellers, are never exposed here."""
    stmt = select(Product).where(*BUYER_VISIBLE)
    if seller_id is not None:
        stmt = stmt.where(Product.seller_id == seller_id)
    stmt = _apply_filters(
        stmt, q=q, category=category, min_price=min_price, max_price=max_price,
        in_stock=in_stock, sort=sort,
    )
    return _paginate(db, stmt, limit, offset)


@router.get("/mine", response_model=Page[ProductListItem])
def list_my_products(
    db: DbSession,
    seller: SellerUser,
    q: Annotated[str | None, Query(max_length=200)] = None,
    category: str | None = None,
    product_status: ProductStatus | None = None,
    sort: ProductSort = ProductSort.newest,
    limit: Annotated[int, Query(ge=1, le=100)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProductListItem]:
    """The seller's own products, active and inactive.

    Scoped by the JWT's user id — there is no way to ask for someone else's.
    """
    stmt = select(Product).where(Product.seller_id == seller.id)
    if product_status is not None:
        stmt = stmt.where(Product.status == product_status)
    stmt = _apply_filters(
        stmt, q=q, category=category, min_price=None, max_price=None, in_stock=None, sort=sort
    )
    return _paginate(db, stmt, limit, offset)


@router.get("/admin", response_model=Page[ProductListItem])
def list_products_admin(
    db: DbSession,
    admin: AdminUser,
    q: Annotated[str | None, Query(max_length=200)] = None,
    category: str | None = None,
    seller_id: uuid.UUID | None = None,
    product_status: ProductStatus | None = None,
    sort: ProductSort = ProductSort.newest,
    limit: Annotated[int, Query(ge=1, le=100)] = 24,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProductListItem]:
    """Platform-wide product listing filtered by seller, category and status
    (PRD.md 5.2, admin side). Read-only: admins hold no product:* permission.
    """
    stmt = select(Product)
    if seller_id is not None:
        stmt = stmt.where(Product.seller_id == seller_id)
    if product_status is not None:
        stmt = stmt.where(Product.status == product_status)
    stmt = _apply_filters(
        stmt, q=q, category=category, min_price=None, max_price=None, in_stock=None, sort=sort
    )
    return _paginate(db, stmt, limit, offset)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: DbSession, seller: ProductCreator) -> ProductRead:
    category = db.get(Category, payload.category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown category")

    product = Product(
        seller_id=seller.id,  # from the JWT, never from the payload
        category_id=category.id,
        name=payload.name,
        slug=_unique_slug(db, payload.name),
        description=payload.description,
        price=payload.price,
        stock=payload.stock,
        status=payload.status,
    )
    product.images = _build_images(payload.images)

    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductRead.from_product(product)


def _build_images(images) -> list[ProductImage]:
    """Exactly one image is main: honour the first flagged one, else promote the
    first image, so `main_image_url` is never ambiguous."""
    rows = [
        ProductImage(url=img.url, is_main=False, sort_order=img.sort_order or index)
        for index, img in enumerate(images)
    ]
    if not rows:
        return rows

    main_index = next((i for i, img in enumerate(images) if img.is_main), 0)
    rows[main_index].is_main = True
    return rows


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: uuid.UUID, db: DbSession) -> ProductRead:
    product = db.scalars(
        select(Product).where(Product.id == product_id, *BUYER_VISIBLE).options(*_EAGER)
    ).unique().one_or_none()

    if product is None:
        # Inactive products, and products belonging to a suspended seller, are
        # indistinguishable from missing ones publicly; the seller reads their
        # own drafts through /products/mine.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    return ProductRead.from_product(product)


@router.post("/{product_id}/view", status_code=status.HTTP_204_NO_CONTENT)
def track_view(product_id: uuid.UUID, db: DbSession) -> Response:
    """Fire-and-forget view logging from the product detail page.

    Always 204, even for an unknown id — the frontend does not act on the result
    and a failed beacon must never surface as an error on a public page.
    """
    view_tracking_service.record_view(db, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _own_product_or_404(db: Session, product_id: uuid.UUID, seller: User) -> Product:
    """Ownership check for every seller write.

    Returns 404 rather than 403 for someone else's product so the endpoint does
    not confirm that an id exists on another seller's account.
    """
    product = db.scalars(
        select(Product).where(Product.id == product_id).options(*_EAGER)
    ).unique().one_or_none()

    if product is None or product.seller_id != seller.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("/{product_id}/edit", response_model=ProductRead)
def get_own_product(product_id: uuid.UUID, db: DbSession, seller: SellerUser) -> ProductRead:
    """Loads the seller's own product for the edit form, including inactive ones."""
    return ProductRead.from_product(_own_product_or_404(db, product_id, seller))


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: uuid.UUID, payload: ProductUpdate, db: DbSession, seller: ProductEditor
) -> ProductRead:
    product = _own_product_or_404(db, product_id, seller)
    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data and data["category_id"] is not None:
        if db.get(Category, data["category_id"]) is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown category")
        product.category_id = data["category_id"]

    if "name" in data and data["name"]:
        product.name = data["name"]
        product.slug = _unique_slug(db, data["name"], exclude_id=product.id)

    for field in ("description", "price", "stock", "status"):
        if field in data:
            setattr(product, field, data[field])

    if "images" in data and payload.images is not None:
        product.images = _build_images(payload.images)

    db.commit()
    db.refresh(product)
    return ProductRead.from_product(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: uuid.UUID, db: DbSession, seller: ProductDeleter) -> None:
    product = _own_product_or_404(db, product_id, seller)
    db.delete(product)
    db.commit()
