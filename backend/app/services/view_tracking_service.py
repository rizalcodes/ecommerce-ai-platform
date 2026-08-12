"""Product view tracking.

Rules.md Section 6: this fires on every product detail page load and must not be
stubbed — it is the only source of the view metrics on both dashboards.
Rows are written to `product_views` rather than incrementing a counter so the
admin dashboard can bucket them by week (Schema.md 2.10).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Product, ProductView


def record_view(db: Session, product_id: uuid.UUID) -> bool:
    """Log one view. Returns False if the product does not exist.

    The caller treats this as fire-and-forget, so a missing product is not an
    error worth failing a page load over.
    """
    exists = db.scalar(select(Product.id).where(Product.id == product_id))
    if exists is None:
        return False

    db.add(ProductView(product_id=product_id))
    db.commit()
    return True
