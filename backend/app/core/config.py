"""Application settings, loaded from environment variables.

Per Rules.md Section 3: API keys are only ever read from the environment here.
Nothing in this module may hardcode or log a secret.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    app_name: str = "AI Commerce Platform API"
    environment: str = "development"
    # Next.js dev server; add the Vercel domain here when the frontend is deployed.
    cors_origins: list[str] = ["http://localhost:3000"]

    # --- Database (Supabase Postgres in deployment, local Postgres for dev) ---
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ecommerce_ai"

    # --- Auth (used from M3 onward) ---
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 12

    # --- External services (used from M3 onward) ---
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_storage_bucket: str = "product-images"
    gemini_api_key: str = ""
    # Configurable because Google retires model names: the first build pinned
    # gemini-2.0-flash, which returned 404 NOT_FOUND once it was withdrawn.
    # Changing models should be an env edit, not a code change.
    gemini_model: str = "gemini-3.5-flash"
    resend_api_key: str = ""
    resend_from_email: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
