"""Shared schema pieces."""

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Offset pagination. Total is returned so the UI can render page counts
    without a second request."""

    items: list[T]
    total: int
    limit: int
    offset: int
