"""Account administration.

PRD.md Section 4 puts users in the admin's remit and the RBAC seed grants admins
`user:manage`, but Architecture.md Section 3 never listed a router for it, so
until now that permission had nothing to guard. This is that router.

Deliberately narrow. "Manage" here means see who is on the platform and suspend
an account; it does not mean editing someone's shop, reassigning roles, or
deleting accounts. Role assignment is fixed at registration for v1 (PRD.md
Section 4 lists no role-management UI), and deleting a seller would cascade
through their catalogue and every inquiry attached to it — suspension achieves
the moderation goal and is reversible.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.core.permissions import require_permission
from app.db.session import get_db
from app.models import Inquiry, Product, Role, SellerProfile, User
from app.schemas.common import Page
from app.schemas.user import AdminUserRow, UserStatusUpdate

router = APIRouter(prefix="/users", tags=["users"])

DbSession = Annotated[Session, Depends(get_db)]
UserManager = Annotated[User, Depends(require_permission("user:manage"))]


def _row_query() -> Select:
    """Account rows with their catalogue and inquiry footprint.

    The two counts are correlated subqueries rather than joins: an outer join to
    both products and inquiries multiplies the rows together, and the counts
    would come back as each other's multiple.
    """
    product_count = (
        select(func.count(Product.id))
        .where(Product.seller_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    inquiry_count = (
        select(func.count(Inquiry.id))
        .where(Inquiry.seller_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )
    return (
        select(
            User.id,
            User.email,
            User.name,
            User.phone,
            User.is_active,
            User.created_at,
            SellerProfile.store_name,
            product_count.label("product_count"),
            inquiry_count.label("inquiry_count"),
        )
        .outerjoin(SellerProfile, SellerProfile.user_id == User.id)
    )


def _to_row(row, roles: list[str]) -> AdminUserRow:
    return AdminUserRow(
        id=row.id,
        email=row.email,
        name=row.name,
        phone=row.phone,
        is_active=row.is_active,
        roles=roles,
        store_name=row.store_name,
        product_count=row.product_count,
        inquiry_count=row.inquiry_count,
        created_at=row.created_at,
    )


def _roles_for(db: Session, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[str]]:
    """One query for the whole page's roles, keyed by user id."""
    if not user_ids:
        return {}

    grouped: dict[uuid.UUID, list[str]] = {user_id: [] for user_id in user_ids}
    rows = db.execute(
        select(User.id, Role.name).join(User.roles).where(User.id.in_(user_ids))
    ).all()
    for user_id, role_name in rows:
        grouped[user_id].append(role_name)
    return {user_id: sorted(names) for user_id, names in grouped.items()}


@router.get("", response_model=Page[AdminUserRow])
def list_users(
    db: DbSession,
    admin: UserManager,
    q: Annotated[str | None, Query(max_length=200, description="Name, email or shop name")] = None,
    role: Annotated[str | None, Query(description="Role name, e.g. seller")] = None,
    is_active: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[AdminUserRow]:
    stmt = _row_query()

    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern),
                SellerProfile.store_name.ilike(pattern),
            )
        )
    if role:
        stmt = stmt.where(User.id.in_(select(User.id).join(User.roles).where(Role.name == role)))
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(User.created_at.desc(), User.name).limit(limit).offset(offset)
    ).all()

    roles = _roles_for(db, [row.id for row in rows])
    return Page[AdminUserRow](
        items=[_to_row(row, roles.get(row.id, [])) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.patch("/{user_id}/status", response_model=AdminUserRow)
def set_user_status(
    user_id: uuid.UUID, payload: UserStatusUpdate, db: DbSession, admin: UserManager
) -> AdminUserRow:
    """Suspend or restore an account.

    A suspended seller's existing listings stay in the database but their token
    stops working immediately: `get_current_user` refuses an inactive account.
    """
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == admin.id and not payload.is_active:
        # Nothing else in the system could undo this, since the endpoint that
        # reverses it needs a working token on an active account.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot deactivate your own account",
        )

    user.is_active = payload.is_active
    db.commit()

    row = db.execute(_row_query().where(User.id == user_id)).one()
    return _to_row(row, sorted(user.role_names))
