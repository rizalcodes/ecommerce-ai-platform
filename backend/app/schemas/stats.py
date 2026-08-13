"""Public statistics schema."""

from pydantic import BaseModel


class PlatformStats(BaseModel):
    total_products: int
    total_sellers: int
    total_categories: int
