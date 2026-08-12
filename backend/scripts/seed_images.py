"""Sources real product photography for the seed catalogue.

Design.md Section 9 asks for real product images rather than placeholders, and
Architecture.md 4.1 puts product images in Supabase Storage. So this downloads
genuine photographs and pushes them through the same storage service the
application uses, which means the seed run also exercises that path.

Images come from Openverse, restricted to CC0 and Public Domain Mark. Those two
licences carry no attribution requirement, which matters for a project that will
be shown to clients — the schema has nowhere to record a credit line.

Downloads are cached under .seed_cache/ so re-running the seed does not re-fetch.
"""

import hashlib
import json
import logging
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

from app.services import storage_service

logger = logging.getLogger(__name__)

OPENVERSE_ENDPOINT = "https://api.openverse.org/v1/images/"
USER_AGENT = "ecommerce-ai-platform-seed/1.0"
CACHE_DIR = Path(__file__).resolve().parent.parent / ".seed_cache"

# Maps a product slug to the cache filenames chosen for it. Written as photos are
# picked, so a re-run reuses the same images instead of searching again. Without
# this, every re-run hammers the image API and can end up throttled or blocked
# partway through, which is exactly what happened during the first seed.
MANIFEST_PATH = CACHE_DIR / "manifest.json"

# Courtesy delay between searches. The seed makes ~80 of them in a burst, which
# is enough to look like scraping to a bot filter.
SEARCH_DELAY_SECONDS = 1.5

# Below this and the photo is too small to sit in a product card without
# looking soft.
MIN_DIMENSION = 500


class ImageFetcher:
    """Finds, downloads and uploads product photos, avoiding repeats."""

    def __init__(self, *, workers: int = 8) -> None:
        self.client = httpx.Client(
            timeout=45, headers={"User-Agent": USER_AGENT}, follow_redirects=True
        )
        self.workers = workers
        self.used_urls: set[str] = set()
        # Several products share a fallback term, so results are cached per query
        # to keep the number of API calls close to the number of distinct terms.
        self._query_cache: dict[str, list[dict]] = {}
        CACHE_DIR.mkdir(exist_ok=True)
        self.manifest: dict[str, list[str]] = self._load_manifest()
        self.blocked = False

    @staticmethod
    def _load_manifest() -> dict[str, list[str]]:
        if MANIFEST_PATH.exists():
            try:
                return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            except ValueError:
                logger.warning("Manifest is unreadable; starting a fresh one")
        return {}

    def _save_manifest(self) -> None:
        MANIFEST_PATH.write_text(json.dumps(self.manifest, indent=2), encoding="utf-8")

    def close(self) -> None:
        self._save_manifest()
        self.client.close()

    # --- search ---

    def search(self, query: str, want: int) -> list[str]:
        """Returns up to `want` unused source URLs for a query."""
        if self.blocked:
            return []

        if query in self._query_cache:
            results = self._query_cache[query]
        else:
            time.sleep(SEARCH_DELAY_SECONDS)
            try:
                response = self.client.get(
                    OPENVERSE_ENDPOINT,
                    params={
                        "q": query,
                        "license": "cc0,pdm",
                        "extension": "jpg",
                        "size": "medium,large",
                        "page_size": 20,
                    },
                )
                if response.status_code in (403, 429):
                    # A bot filter or a throttle. Hammering it makes things worse,
                    # so stop searching for the rest of the run and let the
                    # manifest carry whatever is already cached.
                    self.blocked = True
                    logger.warning(
                        "Image search refused with %s — no further searches this run. "
                        "Cached photos in the manifest are still used.",
                        response.status_code,
                    )
                    return []
                response.raise_for_status()
                results = response.json().get("results", [])
            except (httpx.HTTPError, ValueError) as exc:
                logger.warning("Image search failed for %r: %s", query, type(exc).__name__)
                results = []
            self._query_cache[query] = results

        picked: list[str] = []
        for item in results:
            url = item.get("url")
            width, height = item.get("width") or 0, item.get("height") or 0
            if not url or url in self.used_urls:
                continue
            if width < MIN_DIMENSION or height < MIN_DIMENSION:
                continue
            self.used_urls.add(url)
            picked.append(url)
            if len(picked) == want:
                break
        return picked

    def search_with_fallback(self, queries: list[str], want: int) -> list[str]:
        """Tries each query in turn until enough images are found.

        Narrow product terms often return nothing under a CC0-only filter, so
        every product carries a broader fallback term.
        """
        found: list[str] = []
        for query in queries:
            found.extend(self.search(query, want - len(found)))
            if len(found) >= want:
                break
        return found

    # --- download + upload ---

    @staticmethod
    def cache_name(url: str) -> str:
        return f"{hashlib.sha256(url.encode()).hexdigest()[:24]}.jpg"

    def _download(self, url: str) -> str | None:
        """Downloads to the cache and returns the cache filename."""
        name = self.cache_name(url)
        cache_path = CACHE_DIR / name
        if cache_path.exists():
            return name

        try:
            response = self.client.get(url)
            response.raise_for_status()
            content = response.content
        except httpx.HTTPError:
            return None

        if len(content) < 5_000 or len(content) > storage_service.MAX_UPLOAD_BYTES:
            return None

        cache_path.write_bytes(content)
        return name

    def resolve(self, *, slug: str, queries: list[str], want: int) -> list[str]:
        """Cache filenames for one product, searching only if it has no manifest entry.

        This is pure local/network read work — no database session is open while
        it runs, which is what keeps the seed's transactions short.
        """
        cached = self.manifest.get(slug)
        if cached:
            present = [name for name in cached if (CACHE_DIR / name).exists()]
            if present:
                self.used_urls.update(present)
                return present

        source_urls = self.search_with_fallback(queries, want)
        if not source_urls:
            return []

        with ThreadPoolExecutor(max_workers=self.workers) as pool:
            names = [name for name in pool.map(self._download, source_urls) if name]

        if names:
            self.manifest[slug] = names
            self._save_manifest()
        return names

    def upload(self, *, seller_id: uuid.UUID, cache_names: list[str]) -> list[str]:
        """Uploads cached photos and returns their public Supabase Storage URLs.

        Uploaded in parallel but returned in the original order, because position
        0 becomes the product's main image.
        """
        present = [name for name in cache_names if (CACHE_DIR / name).exists()]
        if not present:
            return []

        def send(name: str) -> str | None:
            try:
                return storage_service.upload_image(
                    seller_id=seller_id,
                    filename="seed.jpg",
                    content=(CACHE_DIR / name).read_bytes(),
                    content_type="image/jpeg",
                )
            except storage_service.StorageError as exc:
                logger.warning("Upload failed for %s: %s", name, exc)
                return None

        with ThreadPoolExecutor(max_workers=self.workers) as pool:
            return [url for url in pool.map(send, present) if url]
