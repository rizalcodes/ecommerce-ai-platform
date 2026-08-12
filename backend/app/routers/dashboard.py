"""Dashboard aggregates — Architecture.md 4.5.

Seller figures are scoped by the JWT's user id. Admin figures are platform-wide
and gated on `analytics:view_platform`.

Every number here comes from a live query. Rules.md Section 7 forbids hardcoded
or placeholder figures anywhere they could reach the UI.
"""

import datetime as dt
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.permissions import SellerUser, require_permission
from app.db.session import get_db
from app.models import (
    Category,
    Inquiry,
    InquiryStatus,
    Notification,
    Product,
    ProductImage,
    ProductStatus,
    ProductView,
    SellerProfile,
    User,
)
from app.schemas.dashboard import (
    AdminDashboard,
    CategoryPerformance,
    InquiryBreakdown,
    ProductMetric,
    SellerDashboard,
    SellerPerformance,
    TrendPoint,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

DbSession = Annotated[Session, Depends(get_db)]
AnalyticsViewer = Annotated[User, Depends(require_permission("analytics:view_platform"))]
PeriodDays = Annotated[int, Query(ge=1, le=365, description="Reporting window in days")]

# One subquery reused wherever a product needs its display image, so the metric
# lists can be rendered as cards without a second round trip.
_MAIN_IMAGE = (
    select(ProductImage.url)
    .where(ProductImage.product_id == Product.id)
    .order_by(ProductImage.is_main.desc(), ProductImage.sort_order)
    .limit(1)
    .correlate(Product)
    .scalar_subquery()
)


def _since(days: int) -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)


def _metrics(db: Session, stmt: Select) -> list[ProductMetric]:
    return [
        ProductMetric(
            product_id=row.id, name=row.name, slug=row.slug,
            main_image_url=row.main_image_url, value=row.value or 0,
        )
        for row in db.execute(stmt).all()
    ]


@router.get("/seller", response_model=SellerDashboard)
def seller_dashboard(db: DbSession, seller: SellerUser, days: PeriodDays = 30) -> SellerDashboard:
    since = _since(days)

    status_counts = dict(
        db.execute(
            select(Inquiry.status, func.count(Inquiry.id))
            .where(Inquiry.seller_id == seller.id)
            .group_by(Inquiry.status)
        ).all()
    )
    breakdown = InquiryBreakdown(
        new=status_counts.get(InquiryStatus.new, 0),
        contacted=status_counts.get(InquiryStatus.contacted, 0),
        closed=status_counts.get(InquiryStatus.closed, 0),
    )

    product_counts = dict(
        db.execute(
            select(Product.status, func.count(Product.id))
            .where(Product.seller_id == seller.id)
            .group_by(Product.status)
        ).all()
    )

    most_viewed = (
        select(
            Product.id, Product.name, Product.slug,
            _MAIN_IMAGE.label("main_image_url"),
            func.count(ProductView.id).label("value"),
        )
        .join(ProductView, ProductView.product_id == Product.id)
        .where(Product.seller_id == seller.id, ProductView.viewed_at >= since)
        .group_by(Product.id)
        .order_by(func.count(ProductView.id).desc())
        .limit(5)
    )

    most_inquired = (
        select(
            Product.id, Product.name, Product.slug,
            _MAIN_IMAGE.label("main_image_url"),
            func.count(Inquiry.id).label("value"),
        )
        .join(Inquiry, Inquiry.product_id == Product.id)
        .where(Product.seller_id == seller.id, Inquiry.created_at >= since)
        .group_by(Product.id)
        .order_by(func.count(Inquiry.id).desc())
        .limit(5)
    )

    return SellerDashboard(
        active_products=product_counts.get(ProductStatus.active, 0),
        inactive_products=product_counts.get(ProductStatus.inactive, 0),
        total_inquiries=breakdown.total,
        inquiries_by_status=breakdown,
        unread_notifications=db.scalar(
            select(func.count(Notification.id)).where(
                Notification.user_id == seller.id, Notification.is_read.is_(False)
            )
        ) or 0,
        most_viewed_products=_metrics(db, most_viewed),
        most_inquired_products=_metrics(db, most_inquired),
        period_days=days,
    )


@router.get("/admin", response_model=AdminDashboard)
def admin_dashboard(db: DbSession, admin: AnalyticsViewer, days: PeriodDays = 30) -> AdminDashboard:
    since = _since(days)

    # A seller is a user with a storefront profile, which is created at
    # registration — cheaper and equivalent to joining through user_roles.
    total_sellers = db.scalar(select(func.count(SellerProfile.user_id))) or 0
    total_products = db.scalar(select(func.count(Product.id))) or 0
    total_categories = db.scalar(select(func.count(Category.id))) or 0
    total_inquiries = db.scalar(select(func.count(Inquiry.id))) or 0

    inquiries_in_period = db.scalar(
        select(func.count(Inquiry.id)).where(Inquiry.created_at >= since)
    ) or 0
    new_listings_in_period = db.scalar(
        select(func.count(Product.id)).where(Product.created_at >= since)
    ) or 0

    category_rows = db.execute(
        select(
            Category.id, Category.name, Category.slug,
            func.count(func.distinct(Product.id)).label("product_count"),
            func.count(func.distinct(Inquiry.id)).label("inquiry_count"),
        )
        .outerjoin(Product, Product.category_id == Category.id)
        .outerjoin(Inquiry, Inquiry.product_id == Product.id)
        .group_by(Category.id)
        .order_by(func.count(func.distinct(Inquiry.id)).desc(), Category.name)
    ).all()

    seller_rows = db.execute(
        select(
            User.id, User.name, SellerProfile.store_name,
            func.count(func.distinct(Product.id)).label("product_count"),
            func.count(func.distinct(Inquiry.id)).label("inquiry_count"),
        )
        .join(SellerProfile, SellerProfile.user_id == User.id)
        .outerjoin(Product, Product.seller_id == User.id)
        .outerjoin(Inquiry, Inquiry.seller_id == User.id)
        .group_by(User.id, SellerProfile.store_name)
        .order_by(func.count(func.distinct(Inquiry.id)).desc(), User.name)
        .limit(10)
    ).all()

    # Weekly buckets built from two separate counts, then merged, so a week with
    # listings but no inquiries (or the reverse) still appears on the chart.
    listing_weeks = dict(
        db.execute(
            select(func.date_trunc("week", Product.created_at).label("w"), func.count(Product.id))
            .where(Product.created_at >= since)
            .group_by("w")
        ).all()
    )
    inquiry_weeks = dict(
        db.execute(
            select(func.date_trunc("week", Inquiry.created_at).label("w"), func.count(Inquiry.id))
            .where(Inquiry.created_at >= since)
            .group_by("w")
        ).all()
    )

    trends = [
        TrendPoint(
            week_start=week.date(),
            new_listings=listing_weeks.get(week, 0),
            inquiries=inquiry_weeks.get(week, 0),
        )
        for week in sorted(set(listing_weeks) | set(inquiry_weeks))
    ]

    top_viewed = (
        select(
            Product.id, Product.name, Product.slug,
            _MAIN_IMAGE.label("main_image_url"),
            func.count(ProductView.id).label("value"),
        )
        .join(ProductView, ProductView.product_id == Product.id)
        .where(ProductView.viewed_at >= since)
        .group_by(Product.id)
        .order_by(func.count(ProductView.id).desc())
        .limit(5)
    )

    return AdminDashboard(
        total_sellers=total_sellers,
        total_products=total_products,
        total_categories=total_categories,
        total_inquiries=total_inquiries,
        inquiries_in_period=inquiries_in_period,
        new_listings_in_period=new_listings_in_period,
        category_performance=[
            CategoryPerformance(
                category_id=r.id, name=r.name, slug=r.slug,
                product_count=r.product_count, inquiry_count=r.inquiry_count,
            )
            for r in category_rows
        ],
        seller_performance=[
            SellerPerformance(
                seller_id=r.id, name=r.name, store_name=r.store_name,
                product_count=r.product_count, inquiry_count=r.inquiry_count,
            )
            for r in seller_rows
        ],
        trends=trends,
        top_viewed_products=_metrics(db, top_viewed),
        period_days=days,
    )
