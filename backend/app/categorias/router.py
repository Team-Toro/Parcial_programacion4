from typing import Annotated, List
from fastapi import APIRouter, Depends, Query, Path
from .schema import CategoriaCreate, CategoriaRead, CategoriaUpdate, CategoriaPublic
from .service import CategoriaService
from ..uow.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/categorias", tags=["Categorías"])
categoria_service = CategoriaService()


@router.get("/", response_model=List[CategoriaPublic], summary="Listar todas las categorías")
def listar_categorias(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    offset: Annotated[int, Query(ge=0, description="Registros a omitir")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Máximo de registros")] = 20,
):
    return categoria_service.get_all(uow, offset, limit)


@router.get("/{categoria_id}", response_model=CategoriaPublic, summary="Obtener una categoría por ID")
def obtener_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return categoria_service.get_by_id(uow, categoria_id)


@router.post("/", response_model=CategoriaPublic, status_code=201, summary="Crear una nueva categoría")
def crear_categoria(
    data: CategoriaCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return categoria_service.create(uow, data)


@router.patch("/{categoria_id}", response_model=CategoriaPublic, summary="Actualizar parcialmente una categoría")
def actualizar_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    data: CategoriaUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return categoria_service.update(uow, categoria_id, data)


@router.delete("/{categoria_id}", status_code=204, summary="Eliminar una categoría (soft delete)")
def eliminar_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    categoria_service.delete(uow, categoria_id)
