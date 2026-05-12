from typing import Annotated, List
from fastapi import APIRouter, Depends, Query, Path, status
from .schema import IngredienteCreate, IngredienteRead, IngredienteUpdate, IngredientePublic
from .service import IngredienteService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import require_role

router = APIRouter(prefix="/ingredientes", tags=["Ingredientes"])
ingrediente_service = IngredienteService()


@router.get(
    "/",
    response_model=List[IngredientePublic],
    dependencies=[Depends(require_role(["admin"]))],
    summary="Listar todos los ingredientes",
    description="Obtiene ingredientes con paginación. Con include_deleted=true devuelve también los dados de baja."
)
def listar_ingredientes(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str | None, Query(min_length=1, description="Búsqueda (case-insensitive) por nombre/descripcion")] = None,
    es_alergeno: Annotated[bool | None, Query(description="Filtrar por alérgeno")] = None,
    sort: Annotated[str | None, Query(pattern="^(nombre|created_at)$", description="Campo de orden")] = None,
    order: Annotated[str, Query(pattern="^(asc|desc)$", description="Dirección de orden")] = "asc",
    include_deleted: Annotated[bool, Query(description="Incluir ingredientes dados de baja")] = False,
):
    return ingrediente_service.get_all(
        uow=uow,
        offset=offset,
        limit=limit,
        q=q,
        es_alergeno=es_alergeno,
        sort=sort,
        order=order,
        include_deleted=include_deleted,
    )


@router.get(
    "/{ingrediente_id}",
    response_model=IngredientePublic,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Obtener un ingrediente por ID",
    responses={
        404: {"description": "Ingrediente no encontrado"}
    }
)
def obtener_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return ingrediente_service.get_by_id(uow, ingrediente_id)


@router.post(
    "/",
    response_model=IngredientePublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Crear un nuevo ingrediente",
    responses={
        409: {"description": "Ya existe un ingrediente con ese nombre"}
    }
)
def crear_ingrediente(
    data: IngredienteCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return ingrediente_service.create(uow, data)


@router.patch(
    "/{ingrediente_id}",
    response_model=IngredientePublic,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Actualizar parcialmente un ingrediente",
    responses={
        404: {"description": "Ingrediente no encontrado"},
        409: {"description": "Ya existe un ingrediente con ese nombre"}
    }
)
def actualizar_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    data: IngredienteUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return ingrediente_service.update(uow, ingrediente_id, data)


@router.delete(
    "/{ingrediente_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Eliminar un ingrediente (soft delete)",
    description="Marca el ingrediente como eliminado",
    responses={
        404: {"description": "Ingrediente no encontrado"}
    }
)
def eliminar_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    ingrediente_service.delete(uow, ingrediente_id)


@router.post(
    "/{ingrediente_id}/reactivar",
    response_model=IngredientePublic,
    dependencies=[Depends(require_role(["admin"]))],
    summary="Reactivar un ingrediente dado de baja",
    responses={
        404: {"description": "Ingrediente no encontrado"},
        400: {"description": "El ingrediente no está dado de baja"}
    }
)
def reactivar_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return ingrediente_service.reactivate(uow, ingrediente_id)
