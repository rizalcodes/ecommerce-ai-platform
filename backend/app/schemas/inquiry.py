"""Inquiry and notification schemas."""

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models import InquiryStatus


class InquiryProductSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    main_image_url: str | None = None


class InquiryCreate(BaseModel):
    """Submitted by an unauthenticated buyer from the product page.

    There is deliberately no seller_id here — it is derived from the product so a
    buyer cannot direct an inquiry at the wrong seller.
    """

    product_id: uuid.UUID
    buyer_name: str = Field(min_length=2, max_length=150)
    buyer_contact: str = Field(min_length=3, max_length=255, description="Email or phone")
    message: str | None = Field(default=None, max_length=2000)


class InquiryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    buyer_name: str
    buyer_contact: str
    message: str | None
    status: InquiryStatus
    created_at: dt.datetime
    updated_at: dt.datetime
    product: InquiryProductSummary | None = None


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus


class InquiryCreated(BaseModel):
    """Minimal confirmation for the buyer — the inquiry itself is not readable
    without a seller token."""

    id: uuid.UUID
    status: InquiryStatus


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    reference_id: uuid.UUID | None
    is_read: bool
    created_at: dt.datetime
