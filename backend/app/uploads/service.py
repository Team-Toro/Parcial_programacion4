import asyncio

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status

from ..core.config import settings
from .schema import CloudinaryResponse

# Configurar el SDK al importar el módulo (condicional, no rompe si faltan vars)
if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def _check_configured() -> None:
    if not (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Cloudinary no está configurado. "
                "Verificá las variables de entorno CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET."
            ),
        )


async def upload_imagen(
    file_bytes: bytes, folder: str = "foodstore/productos"
) -> CloudinaryResponse:
    _check_configured()

    result = await asyncio.to_thread(
        cloudinary.uploader.upload,
        file_bytes,
        folder=folder,
        overwrite=False,
        unique_filename=True,
        resource_type="image",
        allowed_formats=["jpg", "jpeg", "png", "webp"],
    )

    return CloudinaryResponse(
        secure_url=result["secure_url"],
        public_id=result["public_id"],
        width=result.get("width", 0),
        height=result.get("height", 0),
        format=result.get("format", ""),
        resource_type=result.get("resource_type", "image"),
        bytes=result.get("bytes", 0),
    )


async def delete_imagen(public_id: str) -> None:
    _check_configured()

    result = await asyncio.to_thread(
        cloudinary.uploader.destroy,
        public_id,
        resource_type="image",
    )

    # "not found" es OK — la operación es idempotente
    if result.get("result") not in ("ok", "not found"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar imagen de Cloudinary: {result}",
        )
