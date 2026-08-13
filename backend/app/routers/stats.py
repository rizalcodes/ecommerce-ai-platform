"""Public platform totals.

Design.md Section 5 puts a trust strip on the homepage, and Rules.md Section 7
forbids hardcoded or invented figures anywhere in the UI. The storefront is
public, so those counts need a public source: the admin dashboard is gated on
`analytics:view_platform` and cannot serve them.

Deliberately narrow. Counts only, nothing per-seller, nothing about demand —
that stays behind the dashboards.
"""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.visibility import BUYER_VISIBLE
from app.db.session import get_db
from app.models import Category, Product, SellerProfile, User
from app.schemas.stats import PlatformStats

router = APIRouter(prefix="/stats", tags=["stats"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=PlatformStats)
def platform_stats(db: DbSession) -> PlatformStats:
    return PlatformStats(
        # Browsable only, so the strip matches what a shopper can actually reach.
        total_products=db.scalar(select(func.count(Product.id)).where(*BUYER_VISIBLE)) or 0,
        total_sellers=db.scalar(
            select(func.count(SellerProfile.user_id))
            .join(User, User.id == SellerProfile.user_id)
            .where(User.is_active.is_(True))
        ) or 0,
        total_categories=db.scalar(select(func.count(Category.id))) or 0,
    )
