"""Category routes.

Reads are public (the storefront browses by category). Writes require the
`category:manage` permission, which only admins hold — Rules.md Section 2
forbids any seller-side path into this table.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.permissions import require_permission
from app.db.session import get_db
from app.models import Category, Product, ProductStatus, User
from app.schemas.category import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    CategoryWithCount,
)

router = APIRouter(prefix="/categories", tags=["categories"])

DbSession = Annotated[Session, Depends(get_db)]
CategoryManager = Annotated[User, Depends(require_permission("category:manage"))]


def _unique_slug(db: Session, base: str, exclude_id: uuid.UUID | None = None) -> str:
    """Slugify, then suffix -2, -3, ... until unused. Slugs are in public URLs,
    so a collision would silently shadow another category."""
    slug = slugify(base)[:120] or "category"
    candidate = slug
    suffix = 2
    while True:
        stmt = select(Category.id).where(Category.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(Category.id != exclude_id)
        if db.scalar(stmt) is None:
            return candidate
        candidate = f"{slug[:114]}-{suffix}"
        suffix += 1


@router.get("", response_model=list[CategoryWithCount])
def list_categories(db: DbSession) -> list[CategoryWithCount]:
    """All categories with their active-product counts.

    Counts only active products so the storefront never advertises a category
    that leads to an empty grid.
    """
    rows = db.execute(
        select(Category, func.count(Product.id))
        .outerjoin(
            Product,
            (Product.category_id == Category.id) & (Product.status == ProductStatus.active),
        )
        .group_by(Category.id)
        .order_by(Category.name)
    ).all()

    return [
        CategoryWithCount(
            id=category.id,
            name=category.name,
            slug=category.slug,
            created_at=category.created_at,
            product_count=count,
        )
        for category, count in rows
    ]


@router.get("/{slug}", response_model=CategoryWithCount)
def get_category(slug: str, db: DbSession) -> CategoryWithCount:
    category = db.scalar(select(Category).where(Category.slug == slug))
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    count = db.scalar(
        select(func.count(Product.id)).where(
            Product.category_id == category.id, Product.status == ProductStatus.active
        )
    )
    return CategoryWithCount(
        id=category.id,
        name=category.name,
        slug=category.slug,
        created_at=category.created_at,
        product_count=count or 0,
    )


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: DbSession, admin: CategoryManager) -> Category:
    if db.scalar(select(Category).where(Category.name == payload.name)) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A category with this name already exists"
        )

    category = Category(
        name=payload.name,
        slug=_unique_slug(db, payload.slug or payload.name),
        created_by=admin.id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: uuid.UUID, payload: CategoryUpdate, db: DbSession, admin: CategoryManager
) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if payload.name is not None and payload.name != category.name:
        clash = db.scalar(
            select(Category).where(Category.name == payload.name, Category.id != category_id)
        )
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A category with this name already exists",
            )
        category.name = payload.name

    if payload.slug is not None:
        category.slug = _unique_slug(db, payload.slug, exclude_id=category_id)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: uuid.UUID, db: DbSession, admin: CategoryManager) -> None:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    in_use = db.scalar(select(func.count(Product.id)).where(Product.category_id == category_id))
    if in_use:
        # The FK is RESTRICT; refuse explicitly rather than surfacing a raw
        # IntegrityError, and tell the admin how many products are blocking it.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category still has {in_use} product(s) and cannot be deleted",
        )

    db.delete(category)
    db.commit()
