"""SQLAlchemy models — Schema.md Section 2.

Importing this package registers all 12 tables on `Base.metadata`, which is what
Alembic autogenerate reads. Import from here rather than from the submodules so
mapper configuration always sees the full graph.
"""

from app.models.catalog import Category, Product, ProductImage, ProductStatus
from app.models.engagement import Inquiry, InquiryStatus, Notification, ProductView
from app.models.rbac import Permission, Role, role_permissions, user_roles
from app.models.user import SellerProfile, User

__all__ = [
    "Category",
    "Inquiry",
    "InquiryStatus",
    "Notification",
    "Permission",
    "Product",
    "ProductImage",
    "ProductStatus",
    "ProductView",
    "Role",
    "SellerProfile",
    "User",
    "role_permissions",
    "user_roles",
]
