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
from app.core.visibility import BUYER_VISIBLE
from app.models import Category, Product, User

logger = logging.getLogger(__name__)

API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"


def endpoint() -> str:
    """Resolved per call so a model change in .env needs no code edit."""
    return f"{API_ROOT}/{settings.gemini_model}:generateContent"

MAX_CANDIDATES = 12

SYSTEM_INSTRUCTION = """You are the product assistant for an online marketplace.

Rules you must follow:
- Recommend only products from the CANDIDATE PRODUCTS list below. Never invent a
  product, price, seller or specification.
- If nothing in the list fits what the shopper asked for, say so plainly and
  suggest how they could adjust their search. Do not substitute something
  unrelated and present it as a match.
- Some candidates may be listed under ABOVE BUDGET. Those cost more than the
  shopper asked for. Never present one as being within budget. When nothing fits
  the budget but an above-budget match exists, say that nothing meets the budget
  and name the cheapest one that would, with its price.
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

# Function words are excluded because they match product prose, not products.
# "who" alone pulled a body lotion into a search for coffee gifts, because its
# description happens to contain "people who react to scented lotions".
_STOPWORDS = {
    "a", "an", "the", "for", "under", "below", "with", "and", "or", "me", "my",
    "recommend", "suggest", "looking", "need", "want", "show", "find", "something",
    "good", "best", "cheap", "budget", "please", "can", "you", "any", "is", "are",
    "who", "what", "which", "that", "this", "these", "those", "have", "has", "had",
    "get", "got", "buy", "give", "gift", "someone", "some", "there", "their", "your",
    "about", "from", "into", "than", "then", "them", "they", "would", "could",
    "should", "like", "likes", "liked", "know", "does", "was", "were", "one", "two",
    "carikan", "saya", "yang", "untuk", "bawah", "harga", "produk", "ada", "buat",
    "dengan", "atau", "dan", "kasih", "cari", "mau", "punya",
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


def _base_query():
    return (
        select(Product)
        # The assistant can only recommend what a buyer could then go and open.
        .where(*BUYER_VISIBLE)
        .options(
            selectinload(Product.images),
            selectinload(Product.category),
            selectinload(Product.seller).selectinload(User.seller_profile),
        )
    )


def _keyword_filter(stmt, keywords: list[str]):
    conditions = []
    for word in keywords:
        pattern = f"%{word}%"
        conditions.extend(
            [Product.name.ilike(pattern), Product.description.ilike(pattern), Category.name.ilike(pattern)]
        )
    return stmt.outerjoin(Category, Product.category_id == Category.id).where(or_(*conditions))


def find_candidates(db: Session, message: str) -> tuple[list[Product], list[Product]]:
    """Retrieve real products matching the shopper's message.

    Returns (within_budget, above_budget). Only active, in-catalogue products are
    eligible, so the assistant can never surface a draft or a deleted listing.

    The second list exists because filtering on price alone produces a wrong
    answer: asked for "a laptop under RM3000" when the cheapest is RM3499, a
    budget-only search returns no laptops and the assistant concludes the shop
    sells none. Carrying the nearest over-budget matches lets it say what is
    actually true.
    """
    max_price = extract_max_price(message)
    keywords = extract_keywords(message)

    stmt = _base_query()
    if max_price is not None:
        stmt = stmt.where(Product.price <= max_price)
    if keywords:
        stmt = _keyword_filter(stmt, keywords)

    within = list(db.scalars(stmt.order_by(Product.price.asc()).limit(MAX_CANDIDATES)).unique())

    above: list[Product] = []
    if max_price is not None and keywords:
        above = list(
            db.scalars(
                _keyword_filter(_base_query().where(Product.price > max_price), keywords)
                .order_by(Product.price.asc())
                .limit(3)
            ).unique()
        )

    # A price-only question ("anything under RM200?") yields no keywords; fall
    # back to the price filter alone rather than returning nothing. These are
    # context for the model, not results — they match the budget and nothing else.
    if not within and max_price is not None:
        within = list(
            db.scalars(
                _base_query()
                .where(Product.price <= max_price)
                .order_by(Product.price.desc())
                .limit(MAX_CANDIDATES)
            ).unique()
        )

    return within, above


def _format(product: Product) -> str:
    profile = product.seller.seller_profile if product.seller else None
    store = profile.store_name if profile else "Unknown store"
    stock = "in stock" if product.stock > 0 else "out of stock"
    category = product.category.name if product.category else "Uncategorised"
    return f"- {product.name} | RM{product.price} | {category} | {store} | {stock}"


def _render_candidates(within: list[Product], above: list[Product]) -> str:
    sections = []
    if within:
        sections.append("CANDIDATE PRODUCTS:\n" + "\n".join(_format(p) for p in within))
    else:
        sections.append("CANDIDATE PRODUCTS: (none matched)")
    if above:
        sections.append(
            "ABOVE BUDGET (cost more than the shopper asked for):\n"
            + "\n".join(_format(p) for p in above)
        )
    return "\n\n".join(sections)


# --- Generation ------------------------------------------------------------

def ask(db: Session, message: str) -> tuple[str, list[Product]]:
    """Returns (answer, candidate products the answer was grounded in)."""
    if not is_configured():
        raise AIServiceError("The AI assistant is not configured")

    within, above = find_candidates(db, message)

    if not within and not above:
        # No call to Gemini when there is nothing to ground an answer in — this
        # is the cheapest possible guard against a hallucinated recommendation.
        return (
            "I could not find anything in the catalogue matching that. "
            "Try a broader description, a different category, or a higher budget.",
            [],
        )

    prompt = f"{_render_candidates(within, above)}\n\nSHOPPER QUESTION: {message.strip()}"

    try:
        response = httpx.post(
            endpoint(),
            json={
                "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    # Current Flash models spend part of the output budget on
                    # internal reasoning, so a 500-token ceiling cut answers off
                    # mid-sentence. Thinking is disabled and the ceiling raised;
                    # the system prompt is what keeps replies short.
                    "maxOutputTokens": 1024,
                    "thinkingConfig": {"thinkingBudget": 0},
                },
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
        # Log the provider's own message. The first build swallowed a 404 saying
        # the pinned model had been retired, and it surfaced to the operator as
        # nothing more useful than "temporarily unavailable".
        detail = response.text[:300]
        if response.status_code == 404:
            logger.error(
                "Gemini model %r was rejected (404). It has probably been retired — "
                "set GEMINI_MODEL to a current model. Provider said: %s",
                settings.gemini_model, detail,
            )
        elif response.status_code in (400, 401, 403):
            logger.error(
                "Gemini rejected the credentials or request (%s): %s",
                response.status_code, detail,
            )
        elif response.status_code == 429:
            # Free-tier quota. Distinct from an outage because retrying later
            # genuinely works, and the shopper should be told that.
            logger.warning("Gemini quota exhausted: %s", detail)
            raise AIServiceError(
                "The assistant is busy right now. Please try again in a moment."
            )
        else:
            logger.warning("Gemini returned %s: %s", response.status_code, detail)
        raise AIServiceError("The assistant is temporarily unavailable")

    try:
        candidate = response.json()["candidates"][0]
        answer = candidate["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, ValueError):
        logger.warning("Unexpected Gemini response shape")
        raise AIServiceError("The assistant returned an unreadable response") from None

    if candidate.get("finishReason") == "MAX_TOKENS":
        # Surfaced rather than silently returning half a sentence to a shopper.
        logger.warning("Gemini answer hit the output ceiling and was truncated")

    return answer, _cards_for(answer, within, above)


def _cards_for(answer: str, within: list[Product], above: list[Product]) -> list[Product]:
    """Which candidates the widget should render beside the answer.

    Only the products the answer actually names, in the order it named them.
    Everything else the retrieval step found was context for the model, not a
    recommendation: keyword matching pulled a monitor arm into a search for a
    diamond ring (via "gas spring"), and a budget-only fallback hands over a
    dozen products that share nothing but a price cap. Rendering those as cards
    contradicts a reply that just said nothing matched.

    When the answer names nothing — a refusal, or no match — there are no cards,
    which is the honest result.
    """
    lowered = answer.lower()
    named = [p for p in {p.id: p for p in [*within, *above]}.values() if p.name.lower() in lowered]
    return sorted(named, key=lambda p: lowered.index(p.name.lower()))
