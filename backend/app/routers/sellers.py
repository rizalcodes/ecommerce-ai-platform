"""Public storefront profile.

PRD.md Section 7 routes /sellers/[id] as a public page, and it needs the store
description and WhatsApp number, neither of which appear in the seller summary
embedded in a product. Architecture.md Section 3 did not anticipate a separate
router for this; the alternative was overloading /products, which would have
been worse.

Read-only and public. Nothing here exposes the account behind the storefront
beyond what a shopper needs to contact it.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Product, ProductStatus, SellerProfile, User
from app.schemas.user import SellerPublic

router = APIRouter(prefix="/sellers", tags=["sellers"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/{seller_id}", response_model=SellerPublic)
def get_seller(seller_id: uuid.UUID, db: DbSession) -> SellerPublic:
    row = db.execute(
        select(User, SellerProfile)
        .join(SellerProfile, SellerProfile.user_id == User.id)
        .where(User.id == seller_id, User.is_active.is_(True))
    ).one_or_none()

    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Seller not found")

    user, profile = row
    # Counts active listings only, to match what the storefront actually shows.
    product_count = db.scalar(
        select(func.count(Product.id)).where(
            Product.seller_id == seller_id, Product.status == ProductStatus.active
        )
    )

    return SellerPublic(
        id=user.id,
        name=user.name,
        store_name=profile.store_name,
        store_description=profile.store_description,
        whatsapp_number=profile.whatsapp_number,
        avatar_url=profile.avatar_url,
        joined_at=user.created_at,
        product_count=product_count or 0,
    )
