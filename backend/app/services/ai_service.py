"""Gemini integration for the AI Product Assistant.

v1 scope (PRD.md 5.4, Architecture.md 4.3): product discovery only. The model is
given a shortlist of real products retrieved from the database and is instructed
to recommend only from that list. It has no access to analytics or business data
— that is the deferred v1.5/v2 Business Analyst, a separate system.

Rules.md Section 8: responses must never invent products. The retrieval step
below is what makes that checkable — if a name is not in the candidate list, it
did not come from our catalogue.
"""

import logging
import re
from decimal import Decimal

import httpx
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import Category, Product, ProductStatus, User

logger = logging.getLogger(__name__)

MODEL = "gemini-2.0-flash"
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

MAX_CANDIDATES = 12

SYSTEM_INSTRUCTION = """You are the product assistant for an online marketplace.

Rules you must follow:
- Recommend only products from the CANDIDATE PRODUCTS list below. Never invent a
  product, price, seller or specification.
- If nothing in the list fits what the shopper asked for, say so plainly and
  suggest how they could adjust their search. Do not substitute something
  unrelated and present it as a match.
- Quote prices exactly as given, in Malaysian Ringgit (RM).
- Answer only questions about finding products. If asked about sales figures,
  platform analytics or anything else, say that you can only help with finding
  products.
- Be brief and concrete: two or three sentences, then the products themselves.
  No sales language, no exclamation marks."""


class AIServiceError(RuntimeError):
    """Raised when Gemini is unconfigured or unreachable."""


def is_configured() -> bool:
    return bool(settings.gemini_api_key)


# --- Retrieval -------------------------------------------------------------

_PRICE_PATTERNS = (
    r"(?:under|below|less than|cheaper than|bawah|kurang dari)\s*(?:rm)?\s*([\d,]+(?:\.\d+)?)",
    r"(?:rm)\s*([\d,]+(?:\.\d+)?)\s*(?:and below|or less|ke bawah)",
)

_STOPWORDS = {
    "a", "an", "the", "for", "under", "below", "with", "and", "or", "me", "my",
    "recommend", "suggest", "looking", "need", "want", "show", "find", "something",
    "good", "best", "cheap", "budget", "please", "can", "you", "any", "is", "are",
    "carikan", "saya", "yang", "untuk", "bawah", "harga", "produk",
}


def extract_max_price(message: str) -> Decimal | None:
    lowered = message.lower()
    for pattern in _PRICE_PATTERNS:
        match = re.search(pattern, lowered)
        if match:
            try:
                return Decimal(match.group(1).replace(",", ""))
            except (ValueError, ArithmeticError):
                return None
    return None


def extract_keywords(message: str) -> list[str]:
    words = re.findall(r"[a-z0-9]{3,}", message.lower())
    return [w for w in words if w not in _STOPWORDS][:6]


def find_candidates(db: Session, message: str) -> list[Product]:
    """Retrieve real products matching the shopper's message.

    Only active, in-catalogue products are eligible, so the assistant can never
    surface a draft or a deleted listing.
    """
    stmt = (
        select(Product)
        .where(Product.status == ProductStatus.active)
        .options(
            selectinload(Product.images),
            selectinload(Product.category),
            selectinload(Product.seller).selectinload(User.seller_profile),
        )
    )

    max_price = extract_max_price(message)
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)

    keywords = extract_keywords(message)
    if keywords:
        conditions = []
        for word in keywords:
            pattern = f"%{word}%"
            conditions.extend(
                [Product.name.ilike(pattern), Product.description.ilike(pattern), Category.name.ilike(pattern)]
            )
        stmt = stmt.outerjoin(Category, Product.category_id == Category.id).where(or_(*conditions))

    products = list(db.scalars(stmt.order_by(Product.price.asc()).limit(MAX_CANDIDATES)).unique())

    # A price-only question ("anything under RM200?") yields no keywords; fall
    # back to the price filter alone rather than returning nothing.
    if not products and max_price is not None:
        products = list(
            db.scalars(
                select(Product)
                .where(Product.status == ProductStatus.active, Product.price <= max_price)
                .options(selectinload(Product.images), selectinload(Product.category))
                .order_by(Product.price.desc())
                .limit(MAX_CANDIDATES)
            ).unique()
        )

    return products


def _render_candidates(products: list[Product]) -> str:
    if not products:
        return "CANDIDATE PRODUCTS: (none matched)"

    lines = ["CANDIDATE PRODUCTS:"]
    for p in products:
        store = p.seller.seller_profile.store_name if p.seller and p.seller.seller_profile else "Unknown store"
        stock = "in stock" if p.stock > 0 else "out of stock"
        lines.append(
            f"- {p.name} | RM{p.price} | {p.category.name if p.category else 'Uncategorised'} "
            f"| {store} | {stock}"
        )
    return "\n".join(lines)


# --- Generation ------------------------------------------------------------

def ask(db: Session, message: str) -> tuple[str, list[Product]]:
    """Returns (answer, candidate products the answer was grounded in)."""
    if not is_configured():
        raise AIServiceError("The AI assistant is not configured")

    products = find_candidates(db, message)

    if not products:
        # No call to Gemini when there is nothing to ground an answer in — this
        # is the cheapest possible guard against a hallucinated recommendation.
        return (
            "I could not find anything in the catalogue matching that. "
            "Try a broader description, a different category, or a higher budget.",
            [],
        )

    prompt = f"{_render_candidates(products)}\n\nSHOPPER QUESTION: {message.strip()}"

    try:
        response = httpx.post(
            ENDPOINT,
            json={
                "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 500},
            },
            # Key travels as a header, never in the URL, so it cannot leak
            # through request logs.
            headers={"x-goog-api-key": settings.gemini_api_key},
            timeout=30,
        )
    except httpx.HTTPError as exc:
        logger.warning("Gemini request failed: %s", type(exc).__name__)
        raise AIServiceError("The assistant is temporarily unavailable") from exc

    if response.status_code >= 400:
        logger.warning("Gemini returned %s: %s", response.status_code, response.text[:200])
        raise AIServiceError("The assistant is temporarily unavailable")

    try:
        answer = response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, ValueError):
        logger.warning("Unexpected Gemini response shape")
        raise AIServiceError("The assistant returned an unreadable response") from None

    return answer, products
