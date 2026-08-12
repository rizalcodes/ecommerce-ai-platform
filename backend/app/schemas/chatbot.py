"""AI Product Assistant schemas."""

from pydantic import BaseModel, Field

from app.schemas.product import ProductListItem


class ChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=500)


class ChatResponse(BaseModel):
    """The answer plus the products it was grounded in.

    Returning the products lets the widget render real cards next to the reply,
    and makes it visible when an answer is not backed by the catalogue.
    """

    answer: str
    products: list[ProductListItem] = []
