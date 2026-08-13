"""What a buyer is allowed to see.

Two conditions, not one. A product is public when it is active *and* the shop
behind it is still active: suspending a seller (PATCH /users/{id}/status) has to
take their listings out of the storefront, otherwise the suspension only stops
them signing in while their catalogue keeps taking inquiries.

Kept here rather than in a router because the same rule has to hold for the
catalogue, the product page, the AI assistant's candidate set and every public
count. One definition, imported everywhere, so those cannot drift apart.
"""

from sqlalchemy import select

from app.models import Product, ProductStatus, User

# Membership test rather than a join: callers already join Category, and a
# second join would change their row counts.
BUYER_VISIBLE = (
    Product.status == ProductStatus.active,
    Product.seller_id.in_(select(User.id).where(User.is_active.is_(True))),
)
