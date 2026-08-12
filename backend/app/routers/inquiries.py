"""Inquiry routes — the v1 conversion path in place of cart/checkout.

Creating an inquiry is public (buyers have no accounts). Everything else is
scoped to the seller who owns the inquiry, taken from the verified JWT.

Notification endpoints live here because `new_inquiry` is the only notification
type in v1 (Schema.md 2.12) and the seller reads them from the inquiries page.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import SellerUser, require_permission
from app.db.session import SessionLocal, get_db
from app.models import Inquiry, InquiryStatus, Notification, Product, User
from app.schemas.common import Page
from app.schemas.inquiry import (
    InquiryCreate,
    InquiryCreated,
    InquiryRead,
    InquiryStatusUpdate,
    NotificationRead,
)
from app.services import email_service

router = APIRouter(prefix="/inquiries", tags=["inquiries"])

DbSession = Annotated[Session, Depends(get_db)]
InquiryManager = Annotated[User, Depends(require_permission("inquiry:manage"))]

# Rules.md Section 6 fixes the lifecycle as New -> Contacted -> Closed, so status
# only moves forward. Reopening would need Schema.md and both dashboards updated.
_ALLOWED_TRANSITIONS = {
    InquiryStatus.new: {InquiryStatus.contacted, InquiryStatus.closed},
    InquiryStatus.contacted: {InquiryStatus.closed},
    InquiryStatus.closed: set(),
}


def _send_inquiry_email(inquiry_id: uuid.UUID) -> None:
    """Runs after the response is returned, on its own session.

    The request session is already closed by then, so this opens a short-lived
    one rather than reusing a detached object.
    """
    with SessionLocal() as db:
        inquiry = db.get(Inquiry, inquiry_id)
        if inquiry is None:
            return
        seller = inquiry.seller
        email_service.send_inquiry_notification(
            to_email=seller.email,
            seller_name=seller.name,
            store_name=seller.seller_profile.store_name if seller.seller_profile else None,
            product_name=inquiry.product.name,
            buyer_name=inquiry.buyer_name,
            buyer_contact=inquiry.buyer_contact,
            message=inquiry.message,
        )


@router.post("", response_model=InquiryCreated, status_code=status.HTTP_201_CREATED)
def create_inquiry(
    payload: InquiryCreate, db: DbSession, background: BackgroundTasks
) -> InquiryCreated:
    """Public — no authentication (PRD.md 5.3)."""
    product = db.get(Product, payload.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    inquiry = Inquiry(
        product_id=product.id,
        seller_id=product.seller_id,  # derived from the product, never from the buyer
        buyer_name=payload.buyer_name,
        buyer_contact=payload.buyer_contact,
        message=payload.message,
        status=InquiryStatus.new,
    )
    db.add(inquiry)
    db.flush()

    # In-app notification is written in the same transaction as the inquiry, so
    # the seller can never have one without the other.
    db.add(
        Notification(
            user_id=product.seller_id,
            type="new_inquiry",
            reference_id=inquiry.id,
        )
    )
    db.commit()
    db.refresh(inquiry)

    # Email is best-effort and must not delay the buyer's response.
    background.add_task(_send_inquiry_email, inquiry.id)

    return InquiryCreated(id=inquiry.id, status=inquiry.status)


@router.get("/mine", response_model=Page[InquiryRead])
def list_my_inquiries(
    db: DbSession,
    seller: SellerUser,
    inquiry_status: InquiryStatus | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[InquiryRead]:
    stmt = select(Inquiry).where(Inquiry.seller_id == seller.id)
    if inquiry_status is not None:
        stmt = stmt.where(Inquiry.status == inquiry_status)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(selectinload(Inquiry.product).selectinload(Product.images))
        .order_by(Inquiry.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).unique().all()

    return Page[InquiryRead](
        items=[InquiryRead.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(
    db: DbSession,
    seller: SellerUser,
    unread_only: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> list[Notification]:
    stmt = select(Notification).where(Notification.user_id == seller.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    return list(
        db.scalars(stmt.order_by(Notification.created_at.desc()).limit(limit)).all()
    )


@router.post("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: uuid.UUID, db: DbSession, seller: SellerUser
) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != seller.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def _own_inquiry_or_404(db: Session, inquiry_id: uuid.UUID, seller: User) -> Inquiry:
    inquiry = db.scalars(
        select(Inquiry)
        .where(Inquiry.id == inquiry_id)
        .options(selectinload(Inquiry.product).selectinload(Product.images))
    ).unique().one_or_none()

    if inquiry is None or inquiry.seller_id != seller.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
    return inquiry


@router.get("/{inquiry_id}", response_model=InquiryRead)
def get_inquiry(inquiry_id: uuid.UUID, db: DbSession, seller: SellerUser) -> Inquiry:
    return _own_inquiry_or_404(db, inquiry_id, seller)


@router.patch("/{inquiry_id}", response_model=InquiryRead)
def update_inquiry_status(
    inquiry_id: uuid.UUID, payload: InquiryStatusUpdate, db: DbSession, seller: InquiryManager
) -> Inquiry:
    inquiry = _own_inquiry_or_404(db, inquiry_id, seller)

    if payload.status != inquiry.status:
        if payload.status not in _ALLOWED_TRANSITIONS[inquiry.status]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot move an inquiry from {inquiry.status.value} "
                    f"to {payload.status.value}"
                ),
            )
        inquiry.status = payload.status
        db.commit()
        db.refresh(inquiry)

    return inquiry
