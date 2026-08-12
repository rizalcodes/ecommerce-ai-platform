"""FastAPI entrypoint.

Router registration happens here as each router lands in M3
(auth, products, categories, inquiries, dashboard, chatbot, uploads —
see Architecture.md Section 3).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.routers import (
    auth,
    categories,
    chatbot,
    dashboard,
    inquiries,
    products,
    uploads,
)

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(inquiries.router)
app.include_router(uploads.router)
app.include_router(dashboard.router)
app.include_router(chatbot.router)


@app.get("/health")
def health() -> dict:
    """Liveness probe plus a real database round-trip.

    Returns 200 either way so the frontend can distinguish "backend down" from
    "backend up, database unreachable" during setup.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        database = "ok"
        detail = None
    except Exception as exc:  # noqa: BLE001 - surfaced verbatim for local setup
        database = "unreachable"
        detail = type(exc).__name__

    return {
        "status": "ok",
        "environment": settings.environment,
        "database": database,
        "detail": detail,
    }
