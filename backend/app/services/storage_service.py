"""Supabase Storage integration.

Rules.md Section 3: external service calls live here, never in a router.
Uses the Storage REST API directly so the backend keeps a single HTTP client
style across Supabase, Resend and Gemini.
"""

import mimetypes
import uuid
from pathlib import PurePosixPath

import httpx

from app.core.config import settings

# Supabase free-tier friendly ceiling; also caps what a single seller upload can
# cost us before the request is read into memory.
MAX_UPLOAD_BYTES = 5 * 1024 * 1024

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}


class StorageError(RuntimeError):
    """Raised when Supabase Storage is unreachable, unconfigured or rejects a file."""


def is_configured() -> bool:
    return bool(settings.supabase_url and settings.supabase_service_key)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
    }


def _object_url(path: str) -> str:
    return f"{settings.supabase_url}/storage/v1/object/{settings.supabase_storage_bucket}/{path}"


def public_url(path: str) -> str:
    return (
        f"{settings.supabase_url}/storage/v1/object/public/"
        f"{settings.supabase_storage_bucket}/{path}"
    )


def build_object_path(seller_id: uuid.UUID, filename: str) -> str:
    """Namespace uploads per seller and randomise the name.

    Keeps one seller from guessing or overwriting another's object, and stops a
    hostile filename from escaping the prefix.
    """
    suffix = PurePosixPath(filename).suffix.lower()[:10]
    if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".avif"}:
        suffix = ""
    return f"{seller_id}/{uuid.uuid4().hex}{suffix}"


def upload_image(*, seller_id: uuid.UUID, filename: str, content: bytes, content_type: str | None) -> str:
    """Uploads one image and returns its public URL."""
    if not is_configured():
        raise StorageError("Supabase Storage is not configured")

    resolved_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    if resolved_type not in ALLOWED_CONTENT_TYPES:
        raise StorageError(f"Unsupported image type: {resolved_type}")
    if len(content) > MAX_UPLOAD_BYTES:
        raise StorageError(f"Image exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit")

    path = build_object_path(seller_id, filename)

    try:
        response = httpx.post(
            _object_url(path),
            content=content,
            headers={**_headers(), "Content-Type": resolved_type, "x-upsert": "false"},
            timeout=30,
        )
    except httpx.HTTPError as exc:
        raise StorageError(f"Storage request failed: {exc}") from exc

    if response.status_code >= 400:
        raise StorageError(f"Storage rejected the upload ({response.status_code}): {response.text[:200]}")

    return public_url(path)


def list_objects(prefix: str, *, limit: int = 1000) -> list[str]:
    """Object paths under a prefix. Returns [] when storage is unconfigured."""
    if not is_configured():
        return []
    try:
        response = httpx.post(
            f"{settings.supabase_url}/storage/v1/object/list/{settings.supabase_storage_bucket}",
            headers={**_headers(), "Content-Type": "application/json"},
            json={"prefix": prefix, "limit": limit},
            timeout=30,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        return []

    items = response.json()
    # A folder entry has no id; only real objects are returned.
    return [
        f"{prefix}/{item['name']}" if prefix else item["name"]
        for item in items
        if item.get("id")
    ]


def delete_objects(paths: list[str]) -> int:
    """Bulk delete. Returns how many paths were submitted."""
    if not is_configured() or not paths:
        return 0
    try:
        httpx.request(
            "DELETE",
            f"{settings.supabase_url}/storage/v1/object/{settings.supabase_storage_bucket}",
            headers={**_headers(), "Content-Type": "application/json"},
            json={"prefixes": paths},
            timeout=60,
        )
    except httpx.HTTPError:
        return 0
    return len(paths)


def delete_object(path: str) -> None:
    """Best-effort delete. Callers treat failure as non-fatal — an orphaned image
    is cheaper than a failed product update."""
    if not is_configured():
        return
    try:
        httpx.delete(_object_url(path), headers=_headers(), timeout=15)
    except httpx.HTTPError:
        pass
