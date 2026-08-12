"""Category schemas. Categories are admin-managed only (PRD.md 5.1)."""

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    created_at: dt.datetime


class CategoryWithCount(CategoryRead):
    """Used by the storefront category browse section and the admin dashboard's
    category-performance table."""

    product_count: int = 0


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    # Optional — derived from the name when omitted.
    slug: str | None = Field(default=None, min_length=2, max_length=120)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    slug: str | None = Field(default=None, min_length=2, max_length=120)
