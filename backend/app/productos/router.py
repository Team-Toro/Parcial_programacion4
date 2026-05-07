from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from .schema import ProductoCreate, ProductoRead, ProductoUpdate, ProductoPublic, ProductoListResponse
from .service import ProductoService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user
from ..usuarios.model import Usuario

router = APIRouter(prefix="/productos", tags=["Productos"])
producto_service = ProductoService()


@router.get(
    "",
    response_model=ProductoListResponse,
    summary="Listar todos los productos",
    description="Obtiene todos los productos activos con paginación y filtros opcionales"
)
def listar_productos(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    disponible: Annotated[Optional[bool], Query(description="Filtrar por disponibilidad")] = None,
    categoria_id: Annotated[Optional[int], Query(description="Filtrar por categoría (incluye subcategorías)")] = None,
    include_children: Annotated[bool, Query(description="Incluir subcategorías en filtro")] = True,
    q: Annotated[Optional[str], Query(min_length=1, description="Búsqueda (case-insensitive) por nombre/descripcion")] = None,
    precio_min: Annotated[Optional[float], Query(ge=0, description="Precio mínimo")] = None,
    precio_max: Annotated[Optional[float], Query(ge=0, description="Precio máximo")] = None,
    stock_min: Annotated[Optional[int], Query(ge=0, description="Stock mínimo")] = None,
    stock_max: Annotated[Optional[int], Query(ge=0, description="Stock máximo")] = None,
    in_stock: Annotated[Optional[bool], Query(description="Si true: stock > 0; si false: stock <= 0")] = None,
    ingrediente_id: Annotated[Optional[int], Query(ge=1, description="Filtrar por ingrediente")] = None,
    sort: Annotated[Optional[str], Query(pattern="^(nombre|precio_base|created_at|stock_cantidad)$", description="Campo de orden")] = None,
    order: Annotated[str, Query(pattern="^(asc|desc)$", description="Dirección de orden")] = "asc",
):
    items, total = producto_service.get_all_with_count(
        uow=uow,
        offset=offset,
        limit=limit,
        disponible=disponible,
        categoria_id=categoria_id,
        include_children=include_children,
        q=q,
        precio_min=precio_min,
        precio_max=precio_max,
        stock_min=stock_min,
        stock_max=stock_max,
        in_stock=in_stock,
        ingrediente_id=ingrediente_id,
        sort=sort,
        order=order,
    )
    return ProductoListResponse(items=items, total=total)


@router.get(
    "/{producto_id}",
    response_model=ProductoPublic,
    summary="Obtener un producto por ID",
    responses={
        404: {"description": "Producto no encontrado"}
    }
)
def obtener_producto(
    producto_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return producto_service.get_by_id(uow, producto_id)


@router.post(
    "",
    response_model=ProductoPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo producto",
    responses={
        404: {"description": "Categoría o ingrediente no encontrado"},
        409: {"description": "Conflicto de datos"}
    }
)
def crear_producto(
    data: ProductoCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    _current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return producto_service.create(uow, data)


@router.patch(
    "/{producto_id}",
    response_model=ProductoPublic,
    summary="Actualizar parcialmente un producto",
    responses={
        404: {"description": "Producto no encontrado"},
        409: {"description": "Conflicto de datos"}
    }
)
def actualizar_producto(
    producto_id: Annotated[int, Path(ge=1)],
    data: ProductoUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    _current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return producto_service.update(uow, producto_id, data)


@router.delete(
    "/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un producto (soft delete)",
    description="Marca el producto como eliminado",
    responses={
        404: {"description": "Producto no encontrado"}
    }
)
def eliminar_producto(
    producto_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    _current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    producto_service.delete(uow, producto_id)


@router.post(
    "/{producto_id}/reactivar",
    response_model=ProductoPublic,
    summary="Reactivar un producto eliminado",
    description="Restaura un producto que fue marcado como eliminado",
    responses={
        404: {"description": "Producto no encontrado"}
    }
)
def reactivar_producto(
    producto_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    _current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return producto_service.restore(uow, producto_id)
