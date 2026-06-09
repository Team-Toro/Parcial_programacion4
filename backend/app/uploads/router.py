from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ..core.deps import require_role
from . import service as upload_service
from .schema import CloudinaryResponse

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post(
    "/imagen",
    response_model=CloudinaryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["ADMIN"]))],
    summary="Subir una imagen a Cloudinary",
)
async def upload_imagen(
    file: Annotated[UploadFile, File(...)],
    folder: Annotated[str, Form()] = "foodstore/productos",
):
    if file.content_type not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Tipo de archivo no permitido: '{file.content_type}'. "
                "Usá JPEG, PNG o WebP."
            ),
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 5 MB.",
        )

    return await upload_service.upload_imagen(content, folder=folder)


@router.delete(
    "/imagen/{public_id:path}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["ADMIN"]))],
    summary="Eliminar una imagen de Cloudinary por public_id",
    description="El public_id puede contener slashes (ej: foodstore/productos/abc123).",
)
async def delete_imagen(public_id: str):
    await upload_service.delete_imagen(public_id)
