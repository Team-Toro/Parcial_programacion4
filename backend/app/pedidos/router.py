from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.security import OAuth2PasswordBearer
from .schema import (
    PedidoCreate,
    PedidoPublic,
    CambioEstadoRequest,
    CancelarPedidoRequest,
    HistorialEstadoPedidoPublic,
)
from .service import PedidoService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user, require_role
from ..core.security import decode_access_token
from ..usuarios.model import Usuario

oauth2_scheme_pedidos = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


def get_service() -> PedidoService:
    return PedidoService()


@router.post(
    "/",
    response_model=PedidoPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo pedido",
)
def crear_pedido(
    data: PedidoCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    pedido = service.create(uow, current_user.id, data)
    response = PedidoPublic.model_validate(pedido)
    # Propagar external_reference del pago si fue creado por el service
    ext_ref = getattr(pedido, "_external_reference", None)
    if ext_ref is not None:
        response.external_reference = ext_ref
    return response


@router.get(
    "/mis-pedidos",
    response_model=List[PedidoPublic],
    summary="Listar mis pedidos",
)
def listar_mis_pedidos(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    token: Annotated[str, Depends(oauth2_scheme_pedidos)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    payload = decode_access_token(token)
    roles = payload.get("roles", []) if payload else []
    if "ADMIN" in roles or "PEDIDOS" in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para clientes. Usá GET /pedidos/ para ver todos los pedidos",
        )
    return service.list_user_pedidos(uow, current_user.id, offset, limit)


@router.get(
    "/",
    response_model=List[PedidoPublic],
    summary="Listar todos los pedidos (admin/pedidos)",
    dependencies=[Depends(require_role(["ADMIN", "PEDIDOS"]))],
)
def listar_todos_pedidos(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    usuario_id: Annotated[Optional[int], Query(ge=1)] = None,
    estado_codigo: Annotated[Optional[str], Query(max_length=20)] = None,
):
    return service.list_all_pedidos(uow, offset, limit, usuario_id, estado_codigo)


@router.post(
    "/{pedido_id}/avanzar",
    response_model=PedidoPublic,
    summary="Avanzar el estado de un pedido (admin/pedidos)",
)
def avanzar_estado(
    pedido_id: Annotated[int, Path(ge=1)],
    payload: CambioEstadoRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    token: Annotated[str, Depends(oauth2_scheme_pedidos)],
):
    return service.cambiar_estado(uow, pedido_id, payload.nuevo_estado, current_user, token, payload.motivo)


@router.post(
    "/{pedido_id}/cancelar",
    response_model=PedidoPublic,
    summary="Cancelar un pedido",
)
def cancelar_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    payload: CancelarPedidoRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    token: Annotated[str, Depends(oauth2_scheme_pedidos)],
):
    return service.cambiar_estado(uow, pedido_id, "CANCELADO", current_user, token, payload.motivo)


@router.get(
    "/{pedido_id}/historial",
    response_model=List[HistorialEstadoPedidoPublic],
    summary="Obtener historial de estados de un pedido",
)
def get_historial(
    pedido_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    token: Annotated[str, Depends(oauth2_scheme_pedidos)],
):
    return service.get_historial(uow, pedido_id, current_user, token)


@router.get(
    "/{pedido_id}",
    response_model=PedidoPublic,
    summary="Obtener pedido por ID",
    responses={404: {"description": "Pedido no encontrado"}},
)
def obtener_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
    token: Annotated[str, Depends(oauth2_scheme_pedidos)],
):
    payload = decode_access_token(token)
    roles = payload.get("roles", []) if payload else []
    return service.get_pedido_for_user(uow, pedido_id, current_user.id, roles)
