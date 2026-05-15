import uuid
import random
from datetime import datetime
from fastapi import HTTPException
from .model import Pago
from .schema import WebhookMockRequest
from .repository import PagoRepository


class PagoService:

    def crear_pago_para_pedido(self, uow, pedido) -> Pago:
        repo: PagoRepository = uow.pagos
        pago = Pago(
            pedido_id=pedido.id,
            mp_status="pending",
            external_reference=str(uuid.uuid4()),
            idempotency_key=str(uuid.uuid4()),
            transaction_amount=pedido.total,
        )
        repo.add(pago)
        uow.session.flush()
        uow.session.refresh(pago)
        return pago

    def procesar_webhook(self, uow, payload: WebhookMockRequest) -> Pago:
        repo: PagoRepository = uow.pagos
        pago = repo.get_by_external_reference(payload.external_reference)
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")

        # Idempotency: si ya tiene ese status, no hacer nada
        if pago.mp_status == payload.mp_status:
            return pago

        # Actualizar pago
        pago.mp_status = payload.mp_status
        pago.mp_payment_id = payload.mp_payment_id or random.randint(100000, 999999)
        pago.payment_method_id = payload.payment_method_id
        pago.updated_at = datetime.utcnow()
        repo.add(pago)

        # Auto-avance si approved y pedido en PENDIENTE
        if payload.mp_status == "approved":
            pedido = uow.pedidos.get_by_id(pago.pedido_id)
            if pedido and pedido.estado_codigo == "PENDIENTE":
                from ..pedidos.service import PedidoService
                pedido_service = PedidoService()
                pedido_service.cambiar_estado_por_sistema(
                    uow, pedido.id, "CONFIRMADO", "Pago aprobado vía MercadoPago"
                )

        uow.session.flush()
        uow.session.refresh(pago)
        return pago

    def get_pago_by_pedido(self, uow, pedido_id: int, current_user, token: str) -> Pago:
        from ..core.security import decode_access_token
        repo: PagoRepository = uow.pagos
        pago = repo.get_by_pedido_id(pedido_id)
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado para este pedido")

        payload = decode_access_token(token)
        roles = payload.get("roles", []) if payload else []
        es_admin_o_pedidos = "ADMIN" in roles or "PEDIDOS" in roles

        if not es_admin_o_pedidos:
            pedido = uow.pedidos.get_by_id(pedido_id)
            if not pedido or pedido.usuario_id != current_user.id:
                raise HTTPException(status_code=403, detail="No tenés acceso a este pago")

        return pago
