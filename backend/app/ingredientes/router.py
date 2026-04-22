from typing import Annotated, List
from fastapi import APIRouter, Depends, Query, Path
from sqlmodel import Session
from ..database import get_session
from .schema import IngredienteCreate, IngredienteRead, IngredienteUpdate
from . import service as ingrediente_service

router = APIRouter(prefix="/ingredientes", tags=["Ingredientes"])


@router.get("/", response_model=List[IngredienteRead])
def listar_ingredientes(
    session: Annotated[Session, Depends(get_session)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return ingrediente_service.get_all(session, offset, limit)


@router.get("/{ingrediente_id}", response_model=IngredienteRead)
def obtener_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    session: Annotated[Session, Depends(get_session)],
):
    return ingrediente_service.get_by_id(session, ingrediente_id)


@router.post("/", response_model=IngredienteRead, status_code=201)
def crear_ingrediente(
    data: IngredienteCreate,
    session: Annotated[Session, Depends(get_session)],
):
    return ingrediente_service.create(session, data)


@router.patch("/{ingrediente_id}", response_model=IngredienteRead)
def actualizar_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    data: IngredienteUpdate,
    session: Annotated[Session, Depends(get_session)],
):
    return ingrediente_service.update(session, ingrediente_id, data)


@router.delete("/{ingrediente_id}", status_code=204)
def eliminar_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    session: Annotated[Session, Depends(get_session)],
):
    ingrediente_service.delete(session, ingrediente_id)
