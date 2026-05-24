from typing import Annotated
from fastapi import APIRouter, Depends, Path
from .schema import PagoPublic, WebhookMockRequest
from .service import PagoService
from ..uow.unit_of_work import UnitOfWork, get_uow
from ..core.deps import get_current_active_user
from ..usuarios.model import Usuario

router = APIRouter(prefix="/pagos", tags=["Pagos"])

pago_service = PagoService()


@router.post("/webhook", response_model=PagoPublic)
def webhook_mock(
    payload: WebhookMockRequest,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
):
    return pago_service.procesar_webhook(uow, payload)


@router.get("/pedido/{pedido_id}", response_model=PagoPublic)
def get_pago_by_pedido(
    pedido_id: Annotated[int, Path(ge=1)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    current_user: Annotated[Usuario, Depends(get_current_active_user)],
):
    return pago_service.get_pago_by_pedido(uow, pedido_id, current_user)
