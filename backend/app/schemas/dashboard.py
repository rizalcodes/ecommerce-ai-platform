"""Dashboard response schemas.

With no cart or checkout in v1 there is no revenue to report, so every figure
here is a demand or engagement signal (PRD.md 5.5).
"""

import datetime as dt
import uuid

from pydantic import BaseModel


class InquiryBreakdown(BaseModel):
    new: int = 0
    contacted: int = 0
    closed: int = 0

    @property
    def total(self) -> int:
        return self.new + self.contacted + self.closed


class ProductMetric(BaseModel):
    product_id: uuid.UUID
    name: str
    slug: str
    main_image_url: str | None = None
    value: int


class SellerDashboard(BaseModel):
    active_products: int
    inactive_products: int
    total_inquiries: int
    inquiries_by_status: InquiryBreakdown
    unread_notifications: int
    most_viewed_products: list[ProductMetric]
    most_inquired_products: list[ProductMetric]
    period_days: int


class CategoryPerformance(BaseModel):
    category_id: uuid.UUID
    name: str
    slug: str
    product_count: int
    inquiry_count: int


class SellerPerformance(BaseModel):
    seller_id: uuid.UUID
    name: str
    store_name: str | None = None
    product_count: int
    inquiry_count: int


class TrendPoint(BaseModel):
    """One ISO week bucket."""

    week_start: dt.date
    new_listings: int
    inquiries: int


class AdminDashboard(BaseModel):
    total_sellers: int
    total_products: int
    total_categories: int
    total_inquiries: int
    inquiries_in_period: int
    new_listings_in_period: int
    category_performance: list[CategoryPerformance]
    seller_performance: list[SellerPerformance]
    trends: list[TrendPoint]
    top_viewed_products: list[ProductMetric]
    period_days: int
