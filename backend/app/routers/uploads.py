"""Image upload routes.

Sellers upload product images here and receive public URLs, which they then send
back as part of the product payload (Architecture.md 4.1).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.permissions import CurrentUser
from app.schemas.upload import UploadResponse
from app.services import storage_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    user: CurrentUser,
    file: Annotated[UploadFile, File(description="Product image (jpeg, png, webp or avif)")],
) -> UploadResponse:
    if not storage_service.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage is not configured",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")

    try:
        url = storage_service.upload_image(
            # Objects are namespaced by the uploader taken from the JWT, so one
            # seller cannot write into another seller's prefix.
            seller_id=user.id,
            filename=file.filename or "image",
            content=content,
            content_type=file.content_type,
        )
    except storage_service.StorageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return UploadResponse(url=url)
