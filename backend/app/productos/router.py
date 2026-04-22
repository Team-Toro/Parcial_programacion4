from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlmodel import Session
from ..database import get_session
from .schema import ProductoCreate, ProductoRead, ProductoUpdate
from . import service as producto_service

router = APIRouter(prefix="/productos", tags=["Productos"])


@router.get("/", response_model=List[ProductoRead])
def listar_productos(
    session: Annotated[Session, Depends(get_session)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    disponible: Annotated[Optional[bool], Query(description="Filtrar por disponibilidad")] = None,
):
    return producto_service.get_all(session, offset, limit, disponible)


@router.get("/{producto_id}", response_model=ProductoRead)
def obtener_producto(
    producto_id: Annotated[int, Path(ge=1)],
    session: Annotated[Session, Depends(get_session)],
):
    return producto_service.get_by_id(session, producto_id)


@router.post("/", response_model=ProductoRead, status_code=201)
def crear_producto(
    data: ProductoCreate,
    session: Annotated[Session, Depends(get_session)],
):
    return producto_service.create(session, data)


@router.patch("/{producto_id}", response_model=ProductoRead)
def actualizar_producto(
    producto_id: Annotated[int, Path(ge=1)],
    data: ProductoUpdate,
    session: Annotated[Session, Depends(get_session)],
):
    return producto_service.update(session, producto_id, data)


@router.delete("/{producto_id}", status_code=204)
def eliminar_producto(
    producto_id: Annotated[int, Path(ge=1)],
    session: Annotated[Session, Depends(get_session)],
):
    producto_service.delete(session, producto_id)
