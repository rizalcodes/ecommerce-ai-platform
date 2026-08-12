"""Upload schemas."""

from pydantic import BaseModel


class UploadResponse(BaseModel):
    """Public URL of the stored object, ready to attach to a product."""

    url: str
