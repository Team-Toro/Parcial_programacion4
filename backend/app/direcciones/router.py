from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Path, Query, status
from .schema import DireccionCreate, DireccionUpdate, DireccionPublic
from .service import DireccionService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user, require_role
from ..usuarios.model import Usuario

router = APIRouter(prefix="/direcciones", tags=["Direcciones"])


def get_direccion_service() -> DireccionService:
    return DireccionService()


@router.get(
    "/",
    response_model=List[DireccionPublic],
    summary="Listar mis direcciones de entrega",
)
def listar_mis_direcciones(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.list_user_addresses(uow, current_user.id)


@router.post(
    "/",
    response_model=DireccionPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Agregar una dirección de entrega",
)
def crear_direccion(
    data: DireccionCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.create(uow, current_user.id, data)


@router.get(
    "/{direccion_id}",
    response_model=DireccionPublic,
    summary="Obtener una dirección por ID",
    responses={404: {"description": "Dirección no encontrada"}},
)
def obtener_direccion(
    direccion_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.get_user_address(uow, direccion_id, current_user.id)


@router.patch(
    "/{direccion_id}",
    response_model=DireccionPublic,
    summary="Editar una dirección de entrega",
    responses={404: {"description": "Dirección no encontrada"}},
)
def actualizar_direccion(
    direccion_id: Annotated[int, Path(ge=1)],
    data: DireccionUpdate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.update(uow, direccion_id, current_user.id, data)


@router.delete(
    "/{direccion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una dirección (soft delete)",
    responses={404: {"description": "Dirección no encontrada"}},
)
def eliminar_direccion(
    direccion_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    service.soft_delete(uow, direccion_id, current_user.id)


@router.get(
    "/admin/all",
    response_model=List[DireccionPublic],
    summary="Listar todas las direcciones del sistema (admin)",
    dependencies=[Depends(require_role(["ADMIN"]))],
)
def list_all_direcciones(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    usuario_id: Annotated[Optional[int], Query(ge=1)] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
):
    return service.list_all(uow, offset, limit, usuario_id)


@router.post(
    "/{direccion_id}/marcar-principal",
    response_model=DireccionPublic,
    summary="Marcar una dirección como principal",
    responses={404: {"description": "Dirección no encontrada"}},
)
def marcar_principal(
    direccion_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.marcar_principal(uow, direccion_id, current_user.id)


@router.patch(
    "/{direccion_id}/principal",
    response_model=DireccionPublic,
    summary="Marcar una dirección como principal",
    responses={404: {"description": "Dirección no encontrada"}},
)
def marcar_principal_patch(
    direccion_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[DireccionService, Depends(get_direccion_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.marcar_principal(uow, direccion_id, current_user.id)
