import json
import logging
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, WebSocket, WebSocketDisconnect, status

from .schema import (
    PedidoCreate,
    PedidoPublic,
    CambioEstadoRequest,
    CancelarPedidoRequest,
    HistorialEstadoPedidoPublic,
)
from .service import PedidoService, emit_pedido_event
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user, require_role
from ..core.security import decode_access_token
from ..core.websocket import manager
from ..usuarios.model import Usuario
from ..direcciones.schema import DireccionPublic

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])
logger = logging.getLogger(__name__)


def get_service() -> PedidoService:
    return PedidoService()


def _get_primary_role(roles: list[str]) -> str:
    """Returns the highest-priority role for WS room assignment."""
    for role in ("ADMIN", "PEDIDOS", "STOCK", "CLIENTE"):
        if role in roles:
            return role
    return "CLIENTE"


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time pedido events.
    Auth via HttpOnly cookie 'access_token' (sent automatically by the browser).
    Close code 1008 = auth failure.
    """
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.accept()
        await websocket.close(code=1008, reason="Token requerido")
        return

    payload = decode_access_token(token)
    if not payload:
        await websocket.accept()
        await websocket.close(code=1008, reason="Token inválido")
        return

    email = payload.get("sub")
    if not email:
        await websocket.accept()
        await websocket.close(code=1008, reason="Token inválido")
        return

    service = PedidoService()
    try:
        with UnitOfWork() as uow:
            user_id, roles = service.authenticate_ws_user(uow, email)
    except HTTPException:
        await websocket.accept()
        await websocket.close(code=1008, reason="Usuario no autorizado")
        return

    primary_role = _get_primary_role(roles)
    await manager.connect(websocket, primary_role, user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"event": "ERROR", "data": {"message": "JSON inválido"}})
                continue

            action = msg.get("action")

            if action == "subscribe-order":
                order_id = msg.get("order_id")
                if not isinstance(order_id, int) or order_id < 1:
                    await websocket.send_json({"event": "ERROR", "data": {"message": "order_id inválido"}})
                    continue

                # CLIENTE role: validate ownership
                with UnitOfWork() as uow:
                    allowed = service.can_subscribe_to_order(uow, user_id, roles, order_id)
                if not allowed:
                    await websocket.send_json({"event": "ERROR", "data": {"message": f"No tenés acceso al pedido {order_id}"}})
                    continue

                manager.join_order_room(websocket, order_id)
                await websocket.send_json({"event": "SUBSCRIBED", "data": {"order_id": order_id}})

            elif action == "unsubscribe-order":
                order_id = msg.get("order_id")
                if isinstance(order_id, int) and order_id >= 1:
                    manager.leave_order_room(websocket, order_id)
                    await websocket.send_json({"event": "UNSUBSCRIBED", "data": {"order_id": order_id}})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
        raise


# ---------------------------------------------------------------------------
# HTTP endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=PedidoPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo pedido",
)
async def crear_pedido(
    data: PedidoCreate,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    pedido = service.create(uow, current_user.id, data)
    response = PedidoPublic.model_validate(pedido)
    ext_ref = getattr(pedido, "_external_reference", None)
    if ext_ref is not None:
        response.external_reference = ext_ref
    data_ws = response.model_dump(mode="json")
    try:
        await emit_pedido_event(pedido.id, "PENDIENTE", data_ws)
    except Exception:
        logger.exception("WS emit failed after crear_pedido %s", pedido.id)
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
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    solo_activos: Annotated[Optional[bool], Query()] = None,
):
    roles = getattr(current_user, "roles", [])
    if "ADMIN" in roles or "PEDIDOS" in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este endpoint es solo para clientes. Usá GET /pedidos/ para ver todos los pedidos",
        )
    return service.list_user_pedidos(uow, current_user.id, offset, limit, solo_activos)


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
async def avanzar_estado(
    pedido_id: Annotated[int, Path(ge=1)],
    payload: CambioEstadoRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    pedido = service.cambiar_estado(uow, pedido_id, payload.nuevo_estado, current_user, payload.motivo)
    response = PedidoPublic.model_validate(pedido)
    data_ws = response.model_dump(mode="json")
    try:
        await emit_pedido_event(pedido.id, pedido.estado_codigo, data_ws)
    except Exception:
        logger.exception("WS emit failed after avanzar_estado pedido %s", pedido.id)
    return response


@router.post(
    "/{pedido_id}/cancelar",
    response_model=PedidoPublic,
    summary="Cancelar un pedido",
)
async def cancelar_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    payload: CancelarPedidoRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PedidoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    pedido = service.cambiar_estado(uow, pedido_id, "CANCELADO", current_user, payload.motivo)
    response = PedidoPublic.model_validate(pedido)
    data_ws = response.model_dump(mode="json")
    try:
        await emit_pedido_event(pedido.id, "CANCELADO", data_ws)
    except Exception:
        logger.exception("WS emit failed after cancelar_pedido %s", pedido.id)
    return response


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
):
    return service.get_historial(uow, pedido_id, current_user)


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
):
    roles = getattr(current_user, "roles", [])
    pedido = service.get_pedido_for_user(uow, pedido_id, current_user.id, roles)
    response = PedidoPublic.model_validate(pedido)
    if pedido.direccion_id:
        dir_obj = uow.DireccionRepository.get_by_id(pedido.direccion_id, include_deleted=True)
        if dir_obj:
            response.direccion = DireccionPublic.model_validate(dir_obj)
    return response
