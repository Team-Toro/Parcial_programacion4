from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, Path
from .schema import ProductoCreate, ProductoRead, ProductoUpdate, ProductoPublic
from .service import ProductoService
from ..uow.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/productos", tags=["Productos"])
producto_service = ProductoService()


@router.get("/", response_model=List[ProductoPublic], summary="Listar todos los productos")
def listar_productos(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    disponible: Annotated[Optional[bool], Query(description="Filtrar por disponibilidad")] = None,
    categoria_id: Annotated[Optional[int], Query(description="Filtrar por categoría (incluye subcategorías)")] = None,
    include_children: Annotated[bool, Query(description="Incluir subcategorías en filtro")] = True,
):
    return producto_service.get_all(uow, offset, limit, disponible, categoria_id, include_children)


@router.get("/{producto_id}", response_model=ProductoPublic, summary="Obtener un producto por ID")
def obtener_producto(
    producto_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return producto_service.get_by_id(uow, producto_id)


@router.post("/", response_model=ProductoPublic, status_code=201, summary="Crear un nuevo producto")
def crear_producto(
    data: ProductoCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return producto_service.create(uow, data)


@router.patch("/{producto_id}", response_model=ProductoPublic, summary="Actualizar parcialmente un producto")
def actualizar_producto(
    producto_id: Annotated[int, Path(ge=1)],
    data: ProductoUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return producto_service.update(uow, producto_id, data)


@router.delete("/{producto_id}", status_code=204, summary="Eliminar un producto (soft delete)")
def eliminar_producto(
    producto_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    producto_service.delete(uow, producto_id)
