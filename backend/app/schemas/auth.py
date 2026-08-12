"""Auth request/response schemas."""

from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    """Self-registration creates a seller account.

    Buyers have no accounts in v1 (PRD.md Section 4) and admin accounts are
    provisioned through seed/migration, so this is the only signup path.
    """

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=30)
    store_name: str = Field(min_length=2, max_length=150)
    whatsapp_number: str | None = Field(default=None, max_length=30)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead
