from typing import Annotated, List
from fastapi import APIRouter, Depends, Query, Path, status
from .schema import (
    CategoriaCreate, 
    CategoriaUpdate, 
    CategoriaPublic,
    CategoriaStats
)
from .service import CategoriaService
from ..uow.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/categorias", tags=["Categorías"])

def get_categoria_service() -> CategoriaService:
    return CategoriaService()

@router.get(
    "/",
    response_model=List[CategoriaPublic],
    summary="Listar todas las categorías",
    description="Obtiene todas las categorías activas con paginación"
)
def listar_categorias(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
    offset: Annotated[int, Query(ge=0, description="Registros a omitir")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Máximo de registros")] = 20,
):
    return service.get_all(uow, offset, limit)


@router.get(
    "/{categoria_id}",
    response_model=CategoriaPublic,
    summary="Obtener una categoría por ID",
    responses={
        404: {"description": "Categoría no encontrada"}
    }
)
def obtener_categoria(
    categoria_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
):
    return service.get_by_id(uow, categoria_id)


@router.get(
    "/{categoria_id}/stats",
    response_model=CategoriaStats,
    summary="Obtener estadísticas de una categoría",
    description="Retorna contadores de subcategorías, productos y nivel jerárquico",
    responses={
        404: {"description": "Categoría no encontrada"}
    }
)
def obtener_stats(
    categoria_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
):
    return service.get_stats(uow, categoria_id)


@router.post(
    "/",
    response_model=CategoriaPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva categoría",
    responses={
        409: {"description": "Ya existe una categoría con ese nombre"},
        404: {"description": "Categoría padre no encontrada"},
        400: {"description": "Validación fallida (profundidad máxima o referencia circular)"}
    }
)
def crear_categoria(
    data: CategoriaCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
):
    return service.create(uow, data)


@router.patch(
    "/{categoria_id}",
    response_model=CategoriaPublic,
    summary="Actualizar parcialmente una categoría",
    responses={
        404: {"description": "Categoría no encontrada"},
        409: {"description": "Ya existe una categoría con ese nombre"},
        400: {"description": "Validación fallida (profundidad o referencia circular)"}
    }
)
def actualizar_categoria(
    categoria_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
    data: CategoriaUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
):
    return service.update(uow, categoria_id, data)


@router.delete(
    "/{categoria_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una categoría (soft delete)",
    description="Marca la categoría y sus subcategorías como eliminadas",
    responses={
        404: {"description": "Categoría no encontrada"}
    }
)
def eliminar_categoria(
    categoria_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
):
    service.delete(uow, categoria_id)