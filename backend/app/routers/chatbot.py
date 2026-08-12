"""AI Product Assistant route.

The Gemini key stays server-side (Architecture.md Section 7) — the frontend only
ever talks to this endpoint. Public, because the widget is available to
unauthenticated buyers on every page.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chatbot import ChatRequest, ChatResponse
from app.schemas.product import ProductListItem
from app.services import ai_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/status")
def assistant_status() -> dict:
    """Lets the widget hide itself rather than offer a chat that cannot answer."""
    return {"available": ai_service.is_configured()}


@router.post("/ask", response_model=ChatResponse)
def ask(payload: ChatRequest, db: DbSession) -> ChatResponse:
    try:
        answer, products = ai_service.ask(db, payload.message)
    except ai_service.AIServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    return ChatResponse(
        answer=answer, products=[ProductListItem.from_product(p) for p in products]
    )
