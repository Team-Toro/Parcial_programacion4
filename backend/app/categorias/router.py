from typing import Annotated, List
from fastapi import APIRouter, Depends, Query, Path
from sqlmodel import Session
from ..database import get_session
from .schema import CategoriaCreate, CategoriaRead, CategoriaUpdate
from . import service as categoria_service

router = APIRouter(prefix="/categorias", tags=["Categorías"])


@router.get("/", response_model=List[CategoriaRead])
def listar_categorias(
    session: Annotated[Session, Depends(get_session)],
    offset: Annotated[int, Query(ge=0, description="Registros a omitir")] = 0,
    limit: Annotated[int, Query(ge=1, le=100, description="Máximo de registros")] = 20,
):
    return categoria_service.get_all(session, offset, limit)


@router.get("/{categoria_id}", response_model=CategoriaRead)
def obtener_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    session: Annotated[Session, Depends(get_session)],
):
    return categoria_service.get_by_id(session, categoria_id)


@router.post("/", response_model=CategoriaRead, status_code=201)
def crear_categoria(
    data: CategoriaCreate,
    session: Annotated[Session, Depends(get_session)],
):
    return categoria_service.create(session, data)


@router.patch("/{categoria_id}", response_model=CategoriaRead)
def actualizar_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    data: CategoriaUpdate,
    session: Annotated[Session, Depends(get_session)],
):
    return categoria_service.update(session, categoria_id, data)


@router.delete("/{categoria_id}", status_code=204)
def eliminar_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    session: Annotated[Session, Depends(get_session)],
):
    print(f">>> Intentando eliminar categoria {categoria_id}")
    try:
        categoria_service.delete(session, categoria_id)
        print(f">>> Categoria {categoria_id} eliminada OK")
    except Exception as e:
        print(f">>> ERROR al eliminar: {e}")
        raise
