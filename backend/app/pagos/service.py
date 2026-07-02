import uuid
import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status

from ..core.config import settings
from ..uow.unit_of_work import UnitOfWork
from .model import Pago

logger = logging.getLogger(__name__)


class PagoService:

    # ── SDK helpers ────────────────────────────────────────────────────────

    def _require_mp_token(self) -> str:
        token = settings.MP_ACCESS_TOKEN
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MercadoPago no configurado. Agregá MP_ACCESS_TOKEN al .env",
            )
        return token

    def _crear_preferencia_mp(
        self,
        pedido_id: int,
        items_data: list[dict],
        access_token: str,
    ) -> dict:
        """Llama al SDK de MP y crea la preferencia. Retorna {preference_id, init_point}."""
        try:
            import mercadopago
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SDK de MercadoPago no instalado. Ejecutá pip install mercadopago",
            )

        base_url = settings.NGROK_URL or "http://localhost:8000"

        preference_data = {
            "items": items_data,
            "external_reference": str(pedido_id),
            "back_urls": {
                "success": f"{base_url}/api/v1/pagos/redirect/{pedido_id}/success",
                "failure": f"{base_url}/api/v1/pagos/redirect/{pedido_id}/failure",
                "pending": f"{base_url}/api/v1/pagos/redirect/{pedido_id}/pending",
            },
            "notification_url": f"{base_url}/api/v1/pagos/webhook",
            "auto_return": "approved",
        }

        logger.info("Creando preferencia MP pedido=%s items=%s", pedido_id, items_data)

        try:
            sdk = mercadopago.SDK(access_token)
            result = sdk.preference().create(preference_data)
        except Exception:
            logger.exception("Error de red al crear preferencia MP pedido=%s", pedido_id)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Error de conexión con MercadoPago",
            )

        http_status = result.get("status")
        if http_status not in (200, 201):
            msg = result.get("response", {}).get("message", "error desconocido")
            logger.error("MP rechazó preferencia pedido=%s status=%s msg=%s", pedido_id, http_status, msg)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"MercadoPago rechazó la preferencia: {msg}",
            )

        response = result.get("response", {})
        logger.info("Preferencia MP creada pedido=%s pref_id=%s", pedido_id, response.get("id"))

        return {
            "preference_id": response.get("id"),
            "init_point": response.get("init_point"),
        }

    def _consultar_pago_mp(self, payment_id: int, access_token: str) -> dict:
        """Verifica el estado REAL del pago en MP. Nunca confiar en el body del webhook."""
        try:
            import mercadopago
        except ImportError:
            raise RuntimeError("SDK de MercadoPago no instalado")

        try:
            sdk = mercadopago.SDK(access_token)
            result = sdk.payment().get(payment_id)
        except Exception:
            logger.exception("Error de red al consultar pago MP=%s", payment_id)
            raise RuntimeError(f"Error de conexión con MercadoPago al consultar pago {payment_id}")

        if result.get("status") != 200:
            logger.error("MP devolvió status %s para pago %s", result.get("status"), payment_id)
            raise RuntimeError(f"MP devolvió status {result.get('status')} para pago {payment_id}")

        response = result.get("response", {})
        return {
            "mp_payment_id": response.get("id"),
            "mp_status": response.get("status"),
            "mp_status_detail": response.get("status_detail"),
            "mp_merchant_order_id": response.get("order", {}).get("id"),
            "external_reference": response.get("external_reference"),
            "payment_method_id": response.get("payment_method_id"),
        }

    # ── Operaciones de negocio ─────────────────────────────────────────────

    def crear_pago_para_pedido(self, uow: UnitOfWork, pedido) -> Pago:
        """
        Llamado desde pedidos.service.create() al crear un pedido con MERCADOPAGO.
        Crea el registro Pago con estado 'pending' pero SIN preferencia MP todavía.
        La preferencia se crea al hacer click en 'Pagar' (POST /pagos/create-preference).
        """
        pago = Pago(
            pedido_id=pedido.id,
            transaction_amount=pedido.total,
            mp_status="pending",
            external_reference=str(pedido.id),
            idempotency_key=str(uuid.uuid4()),
        )
        uow.pagos.add(pago)
        uow.pagos.flush()
        uow.pagos.refresh(pago)
        logger.info("Pago pendiente creado para pedido=%s (sin preferencia MP)", pedido.id)
        return pago

    def crear_pago(self, uow: UnitOfWork, pedido_id: int, current_user=None) -> dict:
        """
        Llamado desde POST /pagos/create-preference.
        Crea (o reutiliza) la preferencia de MP y devuelve init_point.
        """
        access_token = self._require_mp_token()

        pago = uow.pagos.get_by_pedido_id(pedido_id)
        if not pago:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No existe un pago para este pedido. Verificá que el pedido existe y es MERCADOPAGO.",
            )

        if current_user is not None:
            roles = getattr(current_user, "roles", [])
            if "ADMIN" not in roles and "PEDIDOS" not in roles:
                pedido_check = uow.pedidos.get_by_id(pedido_id)
                if not pedido_check or pedido_check.usuario_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tenés acceso a este pedido",
                    )

        if pago.mp_status == "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este pedido ya fue pagado",
            )

        # Idempotencia: si ya hay una preferencia pendiente, devolver la existente
        if pago.mp_preference_id and pago.mp_status == "pending":
            logger.info("Reutilizando preferencia existente para pedido=%s pref=%s", pedido_id, pago.mp_preference_id)
            return {
                "pago_id": pago.id,
                "preference_id": pago.mp_preference_id,
                "init_point": pago.mp_init_point,
                "public_key": settings.MP_PUBLIC_KEY,
            }

        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido no encontrado")

        if pedido.estado_codigo not in ("PENDIENTE",):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede pagar un pedido en estado {pedido.estado_codigo}",
            )

        # Construir items para la preferencia desde los detalles del pedido
        detalles = getattr(pedido, "detalles", None) or []
        items_data = [
            {
                "title": d.nombre_snapshot,
                "quantity": int(d.cantidad),
                "unit_price": float(d.precio_snapshot),
                "currency_id": "ARS",
            }
            for d in detalles
        ] or [
            {
                "title": f"Pedido #{pedido_id} - FoodStore",
                "quantity": 1,
                "unit_price": float(pedido.total),
                "currency_id": "ARS",
            }
        ]

        mp_data = self._crear_preferencia_mp(
            pedido_id=pedido_id,
            items_data=items_data,
            access_token=access_token,
        )

        pago.mp_preference_id = mp_data["preference_id"]
        pago.mp_init_point = mp_data["init_point"]
        pago.updated_at = datetime.utcnow()
        uow.pagos.add(pago)
        uow.pagos.flush()

        return {
            "pago_id": pago.id,
            "preference_id": pago.mp_preference_id,
            "init_point": pago.mp_init_point,
            "public_key": settings.MP_PUBLIC_KEY,
        }

    def procesar_webhook(
        self,
        uow: UnitOfWork,
        data: dict,
        query_params: Optional[dict] = None,
    ) -> dict:
        """
        Maneja el POST de MP en /pagos/webhook.
        NO confía en el body — siempre verifica el estado contra la API de MP.
        Retorna dict; incluye 'pedido_avanzado' (Pedido ORM) si el pedido pasó a CONFIRMADO.
        """
        logger.info("Webhook MP recibido: body=%s qs=%s", data, query_params or {})

        qs = query_params or {}

        # Extraer topic y payment_id del body o query params (MP varía el formato)
        topic = (
            data.get("type") or data.get("topic")
            or qs.get("type") or qs.get("topic")
        )
        data_id = (
            (data.get("data") or {}).get("id")
            or data.get("data_id")
            or qs.get("data.id")
            or qs.get("id")
        )
        payment_id_raw = data.get("id") or data_id

        if not payment_id_raw:
            logger.info("Webhook ignorado: sin payment_id")
            return {"status": "ignored", "reason": "Sin payment ID"}

        if topic not in (None, "payment", "merchant_order"):
            logger.info("Webhook ignorado: topic=%s", topic)
            return {"status": "ignored", "reason": f"Topic no soportado: {topic}"}

        try:
            payment_id = int(payment_id_raw)
        except (TypeError, ValueError):
            return {"status": "ignored", "reason": f"payment_id inválido: {payment_id_raw}"}

        access_token = settings.MP_ACCESS_TOKEN
        if not access_token:
            logger.warning("Webhook recibido pero MP_ACCESS_TOKEN no configurado")
            return {"status": "error", "reason": "MP no configurado"}

        try:
            mp_info = self._consultar_pago_mp(payment_id, access_token)
        except RuntimeError as e:
            logger.exception("Error consultando pago MP=%s desde webhook", payment_id)
            return {"status": "error", "reason": str(e)}

        mp_status = mp_info.get("mp_status")
        logger.info("Pago MP=%s verificado: status=%s detail=%s", payment_id, mp_status, mp_info.get("mp_status_detail"))

        # Buscar Pago local: por payment_id primero (idempotencia), luego por external_reference
        pago = uow.pagos.get_by_mp_payment_id(payment_id)
        if not pago:
            ext_ref = mp_info.get("external_reference")
            if ext_ref:
                try:
                    pago = uow.pagos.get_by_pedido_id(int(ext_ref))
                except (TypeError, ValueError):
                    pass
        if not pago and mp_info.get("mp_merchant_order_id"):
            pago = uow.pagos.get_by_mp_merchant_order_id(int(mp_info["mp_merchant_order_id"]))

        if not pago:
            logger.warning("Webhook: no se encontró Pago para payment_id=%s", payment_id)
            return {"status": "ignored", "reason": "Pago no encontrado en BD local"}

        # Idempotencia: mismo payment_id y mismo status → ya procesado
        if pago.mp_payment_id == payment_id and pago.mp_status == mp_status:
            logger.info("Webhook idempotente: pago=%s ya en status=%s", pago.id, mp_status)
            return {"status": "already_processed", "pago_id": pago.id, "mp_status": mp_status}

        # Actualizar Pago
        pago.mp_payment_id = payment_id
        pago.mp_status = mp_status
        pago.mp_status_detail = mp_info.get("mp_status_detail")
        pago.mp_merchant_order_id = mp_info.get("mp_merchant_order_id")
        pago.payment_method_id = mp_info.get("payment_method_id")
        pago.updated_at = datetime.utcnow()
        uow.pagos.add(pago)
        uow.pagos.flush()

        pedido_avanzado = None
        if mp_status == "approved":
            pedido_avanzado = self._aprobar_pedido(uow, pago.pedido_id)

        result: dict = {
            "status": "processed",
            "pago_id": pago.id,
            "mp_status": mp_status,
            "pedido_id": pago.pedido_id,
        }
        if pedido_avanzado is not None:
            result["pedido_avanzado"] = pedido_avanzado
        return result

    def confirmar_pago(
        self,
        uow: UnitOfWork,
        pedido_id: int,
        payment_id: Optional[int] = None,
    ) -> dict:
        """
        Llamado desde el frontend en SuccessPage.
        Verifica el pago contra MP API (nunca confiar en query params del back_url).
        Retorna dict con 'estado' y opcionalmente 'pedido_avanzado'.
        """
        pago = uow.pagos.get_by_pedido_id(pedido_id)
        if not pago:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pago no encontrado para este pedido",
            )

        resolved_payment_id = payment_id or pago.mp_payment_id
        if not resolved_payment_id:
            # Webhook todavía no llegó — devolver el estado actual sin verificar MP
            logger.info("confirmar_pago pedido=%s: sin payment_id, devolviendo estado local", pedido_id)
            return {"estado": pago.mp_status, "pedido_id": pedido_id}

        access_token = settings.MP_ACCESS_TOKEN
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MercadoPago no configurado",
            )

        try:
            mp_info = self._consultar_pago_mp(resolved_payment_id, access_token)
        except RuntimeError as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))

        mp_status = mp_info.get("mp_status")
        logger.info("confirmar_pago pedido=%s payment_id=%s status=%s", pedido_id, resolved_payment_id, mp_status)

        # Idempotencia
        if pago.mp_payment_id == resolved_payment_id and pago.mp_status == mp_status:
            return {"estado": mp_status, "pedido_id": pedido_id}

        # Actualizar Pago
        pago.mp_payment_id = resolved_payment_id
        pago.mp_status = mp_status
        pago.mp_status_detail = mp_info.get("mp_status_detail")
        pago.mp_merchant_order_id = mp_info.get("mp_merchant_order_id")
        pago.payment_method_id = mp_info.get("payment_method_id")
        pago.updated_at = datetime.utcnow()
        uow.pagos.add(pago)
        uow.pagos.flush()

        pedido_avanzado = None
        if mp_status == "approved":
            pedido_avanzado = self._aprobar_pedido(uow, pedido_id)

        result: dict = {"estado": mp_status, "pedido_id": pedido_id}
        if pedido_avanzado is not None:
            result["pedido_avanzado"] = pedido_avanzado
        return result

    def _aprobar_pedido(self, uow: UnitOfWork, pedido_id: int):
        """
        Avanza el pedido a CONFIRMADO cuando el pago es aprobado.
        Retorna el Pedido ORM actualizado (para que el router emita WS), o None si no aplica.
        """
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            logger.warning("_aprobar_pedido: pedido=%s no encontrado", pedido_id)
            return None
        if pedido.estado_codigo != "PENDIENTE":
            logger.info("_aprobar_pedido: pedido=%s ya en estado=%s", pedido_id, pedido.estado_codigo)
            return None

        from ..pedidos.service import PedidoService
        PedidoService().cambiar_estado_por_sistema(
            uow, pedido_id, "CONFIRMADO", "Pago aprobado vía MercadoPago"
        )

        pedido = uow.pedidos.get_by_id(pedido_id)
        logger.info("Pedido=%s avanzado a CONFIRMADO por pago aprobado", pedido_id)
        return pedido

    def get_pago_by_pedido(self, uow: UnitOfWork, pedido_id: int, current_user) -> Pago:
        """Retorna el Pago de un pedido validando que el usuario tenga acceso."""
        pago = uow.pagos.get_by_pedido_id(pedido_id)
        if not pago:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pago no encontrado para este pedido",
            )
        roles = getattr(current_user, "roles", [])
        if "ADMIN" not in roles and "PEDIDOS" not in roles:
            pedido = uow.pedidos.get_by_id(pedido_id)
            if not pedido or pedido.usuario_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tenés acceso a este pago",
                )
        return pago
