"""Resend integration — transactional email to sellers.

Architecture.md 4.2: a new inquiry writes an in-app notification and sends an
email. Email is best-effort: if Resend is unconfigured or failing, the inquiry is
still saved and the seller still sees the in-app notification. Losing a buyer's
message because a third party is down would be the worse failure.
"""

import html
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"


def is_configured() -> bool:
    return bool(settings.resend_api_key and settings.resend_from_email)


def _render(*, seller_name: str, store_name: str | None, product_name: str,
            buyer_name: str, buyer_contact: str, message: str | None) -> str:
    """Plain, readable HTML. No marketing voice, no images, no tracking —
    it is a notification, not a campaign."""
    safe = {k: html.escape(v or "") for k, v in {
        "seller_name": seller_name, "store_name": store_name, "product_name": product_name,
        "buyer_name": buyer_name, "buyer_contact": buyer_contact, "message": message,
    }.items()}

    at_store = f" at {safe['store_name']}" if safe["store_name"] else ""
    body = (
        f"<p>Hi {safe['seller_name']},</p>"
        f"<p>{safe['buyer_name']} asked about <strong>{safe['product_name']}</strong>"
        f"{at_store}.</p>"
        f"<p><strong>Contact:</strong> {safe['buyer_contact']}</p>"
    )
    if safe["message"]:
        body += f"<p><strong>Message:</strong><br>{safe['message']}</p>"
    body += "<p>Open your dashboard to reply and update the inquiry status.</p>"
    return body


def send_inquiry_notification(
    *,
    to_email: str,
    seller_name: str,
    store_name: str | None,
    product_name: str,
    buyer_name: str,
    buyer_contact: str,
    message: str | None,
) -> bool:
    """Returns True if Resend accepted the message. Never raises."""
    if not is_configured():
        logger.info("Resend not configured; skipping inquiry email to %s", to_email)
        return False

    payload = {
        "from": settings.resend_from_email,
        "to": [to_email],
        "subject": f"New inquiry about {product_name}",
        "html": _render(
            seller_name=seller_name, store_name=store_name, product_name=product_name,
            buyer_name=buyer_name, buyer_contact=buyer_contact, message=message,
        ),
    }

    try:
        response = httpx.post(
            RESEND_ENDPOINT,
            json=payload,
            # The key goes in the header only — it is never logged, including in
            # the error branch below.
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            timeout=15,
        )
    except httpx.HTTPError as exc:
        logger.warning("Inquiry email failed to send: %s", type(exc).__name__)
        return False

    if response.status_code >= 400:
        logger.warning("Resend rejected the email (%s): %s", response.status_code, response.text[:200])
        return False

    return True
