from typing import Annotated, List
from fastapi import APIRouter, Depends, Query, Path
from .schema import IngredienteCreate, IngredienteRead, IngredienteUpdate, IngredientePublic
from .service import IngredienteService
from ..uow.unit_of_work import UnitOfWork, get_uow

router = APIRouter(prefix="/ingredientes", tags=["Ingredientes"])
ingrediente_service = IngredienteService()


@router.get("/", response_model=List[IngredientePublic], summary="Listar todos los ingredientes")
def listar_ingredientes(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return ingrediente_service.get_all(uow, offset, limit)


@router.get("/{ingrediente_id}", response_model=IngredientePublic, summary="Obtener un ingrediente por ID")
def obtener_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return ingrediente_service.get_by_id(uow, ingrediente_id)


@router.post("/", response_model=IngredientePublic, status_code=201, summary="Crear un nuevo ingrediente")
def crear_ingrediente(
    data: IngredienteCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return ingrediente_service.create(uow, data)


@router.patch("/{ingrediente_id}", response_model=IngredientePublic, summary="Actualizar parcialmente un ingrediente")
def actualizar_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    data: IngredienteUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return ingrediente_service.update(uow, ingrediente_id, data)


@router.delete("/{ingrediente_id}", status_code=204, summary="Eliminar un ingrediente (soft delete)")
def eliminar_ingrediente(
    ingrediente_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    ingrediente_service.delete(uow, ingrediente_id)
