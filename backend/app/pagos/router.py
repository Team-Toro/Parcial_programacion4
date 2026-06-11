import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request
from fastapi.responses import RedirectResponse

from .schema import (
    PagoPublic,
    CrearPreferenciaRequest,
    ConfirmarPagoRequest,
    PagoCrearResponse,
    PagoEstadoResponse,
)
from .service import PagoService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.config import settings
from ..core.deps import get_current_active_user
from ..usuarios.model import Usuario
from ..pedidos.schema import PedidoPublic
from ..pedidos.service import emit_pedido_event

router = APIRouter(prefix="/pagos", tags=["Pagos"])
logger = logging.getLogger(__name__)


def get_service() -> PagoService:
    return PagoService()


# ---------------------------------------------------------------------------
# Crear preferencia de pago MP (requiere auth)
# ---------------------------------------------------------------------------

@router.post(
    "/create-preference",
    response_model=PagoCrearResponse,
    summary="Crea preferencia de pago en MercadoPago y retorna el init_point",
)
async def create_preference(
    data: CrearPreferenciaRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PagoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    result = service.crear_pago(uow, data.pedido_id)
    return PagoCrearResponse(**result)


# ---------------------------------------------------------------------------
# Webhook de MercadoPago (SIN auth — MP no manda cookies)
# ---------------------------------------------------------------------------

@router.post(
    "/webhook",
    summary="Webhook recibido desde MercadoPago (sin autenticación)",
)
async def webhook(
    request: Request,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PagoService, Depends(get_service)],
):
    try:
        query_params = dict(request.query_params)
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            data = await request.json()
        else:
            form_data = await request.form()
            data = dict(form_data)
    except Exception:
        logger.exception("Error leyendo body del webhook MP")
        data = {}
        query_params = dict(request.query_params)

    result = service.procesar_webhook(uow, data, query_params)

    # Emitir WS si el pedido avanzó a CONFIRMADO
    pedido = result.pop("pedido_avanzado", None)
    if pedido is not None:
        try:
            pedido_data = PedidoPublic.model_validate(pedido).model_dump(mode="json")
            await emit_pedido_event(pedido.id, "CONFIRMADO", pedido_data)
        except Exception:
            logger.exception("WS emit falló tras webhook MP pedido=%s", pedido.id)

    return result


# ---------------------------------------------------------------------------
# Confirmar pago (llamado desde el frontend en SuccessPage)
# ---------------------------------------------------------------------------

@router.post(
    "/confirm",
    response_model=PagoEstadoResponse,
    summary="Frontend llama esto desde SuccessPage para verificar el pago con MP",
)
async def confirm_payment(
    data: ConfirmarPagoRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PagoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    result = service.confirmar_pago(uow, data.pedido_id, data.payment_id)

    # Emitir WS si el pedido avanzó a CONFIRMADO
    pedido = result.pop("pedido_avanzado", None)
    if pedido is not None:
        try:
            pedido_data = PedidoPublic.model_validate(pedido).model_dump(mode="json")
            await emit_pedido_event(pedido.id, "CONFIRMADO", pedido_data)
        except Exception:
            logger.exception("WS emit falló tras confirm_payment pedido=%s", pedido.id)

    return PagoEstadoResponse(**result)


# ---------------------------------------------------------------------------
# Redirect desde MP (back_url) → reenvía al frontend con query params intactos
# ---------------------------------------------------------------------------

@router.get(
    "/redirect/{pedido_id}/{mp_status}",
    summary="MP redirige aquí tras el pago; este endpoint reenvía al frontend",
)
async def redirect_after_pago(
    pedido_id: Annotated[int, Path(ge=1)],
    mp_status: str,
    request: Request,
):
    frontend_url = settings.FRONTEND_URL
    qs = str(request.url.query)
    destination = f"{frontend_url}/pagos/{pedido_id}/{mp_status}"
    if qs:
        destination += f"?{qs}"
    logger.info("Redirect MP: pedido=%s status=%s → %s", pedido_id, mp_status, destination)
    return RedirectResponse(url=destination, status_code=302)


# ---------------------------------------------------------------------------
# Consultar pago por pedido (requiere auth)
# ---------------------------------------------------------------------------

@router.get(
    "/pedido/{pedido_id}",
    response_model=PagoPublic,
    summary="Obtener el estado del pago de un pedido",
)
def get_pago_by_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    service: Annotated[PagoService, Depends(get_service)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return service.get_pago_by_pedido(uow, pedido_id, current_user)
