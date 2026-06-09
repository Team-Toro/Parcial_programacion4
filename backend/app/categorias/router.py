from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from .schema import (
    CategoriaCreate,
    CategoriaUpdate,
    CategoriaPublic,
    CategoriaStats,
    ImagenCategoriaUpdate,
)
from .service import CategoriaService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_optional_user, require_role, require_role_if_include_deleted
from ..usuarios.model import Usuario

router = APIRouter(prefix="/categorias", tags=["Categorías"])

def get_categoria_service() -> CategoriaService:
    return CategoriaService()

@router.get(
    "/",
    response_model=List[CategoriaPublic],
    summary="Listar todas las categorías",
    description="Obtiene categorías con paginación. Con include_deleted=true devuelve también las dadas de baja (solo admin)."
)
def listar_categorias(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
    _optional_user: Annotated[Usuario | None, Depends(get_optional_user)],
    _admin_if_deleted: Annotated[Usuario | None, Depends(require_role_if_include_deleted(["ADMIN", "STOCK"]))],
    offset: Annotated[int, Query(ge=0, description="Registros a omitir")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Máximo de registros")] = 20,
    q: Annotated[str | None, Query(min_length=1, description="Búsqueda (case-insensitive) por nombre/descripcion")] = None,
    parent_id: Annotated[int | None, Query(ge=1, description="Filtrar por categoría padre (hijos directos)")] = None,
    only_roots: Annotated[bool, Query(description="Solo categorías raíz (parent_id NULL)")] = False,
    sort: Annotated[str | None, Query(pattern="^(nombre|created_at|parent_id)$", description="Campo de orden")] = None,
    order: Annotated[str, Query(pattern="^(asc|desc)$", description="Dirección de orden")] = "asc",
    include_deleted: Annotated[bool, Query(description="Incluir categorías eliminadas (solo admin)")] = False,
):
    return service.get_all(
        uow=uow,
        offset=offset,
        limit=limit,
        q=q,
        parent_id=parent_id,
        only_roots=only_roots,
        sort=sort,
        order=order,
        include_deleted=include_deleted,
    )


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
    _optional_user: Annotated[Usuario | None, Depends(get_optional_user)],
    _admin_if_deleted: Annotated[Usuario | None, Depends(require_role_if_include_deleted(["ADMIN", "STOCK"]))],
    include_deleted: Annotated[bool, Query(description="Incluir categorías eliminadas (solo admin)")] = False,
):
    return service.get_by_id(
        uow,
        categoria_id,
        include_deleted=include_deleted,
    )


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
    dependencies=[Depends(require_role(["ADMIN", "STOCK"]))],
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
    dependencies=[Depends(require_role(["ADMIN", "STOCK"]))],
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
    dependencies=[Depends(require_role(["ADMIN", "STOCK"]))],
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


@router.patch(
    "/{categoria_id}/imagen",
    response_model=CategoriaPublic,
    dependencies=[Depends(require_role(["ADMIN"]))],
    summary="Actualizar la imagen de una categoría",
    responses={
        404: {"description": "Categoría no encontrada"}
    }
)
def actualizar_imagen_categoria(
    categoria_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
    data: ImagenCategoriaUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
):
    return service.actualizar_imagen(uow, categoria_id, data.imagen_url)


@router.post(
    "/{categoria_id}/reactivar",
    response_model=CategoriaPublic,
    dependencies=[Depends(require_role(["ADMIN", "STOCK"]))],
    summary="Reactivar una categoría dada de baja",
    responses={
        404: {"description": "Categoría no encontrada"},
        400: {"description": "La categoría no está dada de baja"}
    }
)
def reactivar_categoria(
    categoria_id: Annotated[int, Path(ge=1, description="ID de la categoría")],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[CategoriaService, Depends(get_categoria_service)],
):
    return service.reactivate(uow, categoria_id)
