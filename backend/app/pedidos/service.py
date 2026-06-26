import logging
from typing import List
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status
from .model import Pedido, DetallePedido, HistorialEstadoPedido
from .schema import PedidoCreate
from ..uow.unit_of_work import UnitOfWork
from ..productos.service import calcular_stock_disponible
from ..productos.model import Producto
from ..estados_pedido.service import EstadoPedidoService
from ..core.config import settings

ROLES_PEDIDOS = {"ADMIN", "PEDIDOS"}

logger = logging.getLogger(__name__)

_EVENTO_POR_ESTADO: dict[str, str] = {
    "PENDIENTE":  "NUEVO_PEDIDO",
    "CONFIRMADO": "PEDIDO_CONFIRMADO",
    "EN_PREP":    "PEDIDO_EN_PREPARACION",
    "EN_CAMINO":  "PEDIDO_EN_CAMINO",
    "ENTREGADO":  "PEDIDO_ENTREGADO",
    "CANCELADO":  "PEDIDO_CANCELADO",
}

_ROLES_POR_ESTADO: dict[str, list[str]] = {
    "PENDIENTE":  ["ADMIN", "PEDIDOS"],
    "CONFIRMADO": ["ADMIN", "PEDIDOS"],
    "EN_PREP":    ["ADMIN", "PEDIDOS", "STOCK"],
    "EN_CAMINO":  ["ADMIN", "PEDIDOS"],
    "ENTREGADO":  ["ADMIN", "PEDIDOS"],
    "CANCELADO":  ["ADMIN", "PEDIDOS"],
}


def _ajustar_stock(pedido: "Pedido", uow: "UnitOfWork", signo: int) -> None:
    for detalle in pedido.detalles:
        producto = uow.session.get(Producto, detalle.producto_id)
        if producto is None:
            continue
        if not producto.ingredientes:
            producto.stock_cantidad += signo * detalle.cantidad
            uow.session.add(producto)
        else:
            for link in producto.ingredientes:
                if link.ingrediente is not None:
                    link.ingrediente.stock_actual += signo * link.cantidad * detalle.cantidad
                    uow.session.add(link.ingrediente)


class PedidoService:

    def create(self, uow: UnitOfWork, usuario_id: int, data: PedidoCreate) -> Pedido:
        """Valida stock, crea el Pedido con sus detalles y registra el historial inicial."""
        # 1. Validar forma de pago
        forma_pago = uow.formas_pago.get_by_codigo(data.forma_pago_codigo)
        if not forma_pago:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Forma de pago '{data.forma_pago_codigo}' no existe")
        if not forma_pago.habilitado:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Forma de pago '{data.forma_pago_codigo}' no está habilitada")

        # 2. Validar dirección
        if data.forma_pago_codigo == "EFECTIVO":
            direccion_id = None
        else:
            if data.direccion_id is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail="Debe indicar una dirección de entrega para esta forma de pago")
            direccion = uow.direcciones.get_by_id_for_user(data.direccion_id, usuario_id)
            if not direccion:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                    detail=f"Dirección {data.direccion_id} no encontrada")
            direccion_id = data.direccion_id

        # 3. Validar items y construir snapshots
        item_snapshots = []
        for item in data.items:
            producto = uow.productos.get_by_id_including_deleted(item.producto_id)
            if not producto:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=f"Producto {item.producto_id} no existe")
            if producto.deleted_at is not None or not producto.disponible:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=f"Producto '{producto.nombre}' no disponible")
            stock_disp = calcular_stock_disponible(producto)
            if stock_disp < item.cantidad:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para '{producto.nombre}' (disponible: {stock_disp}, solicitado: {item.cantidad})"
                )

            if item.personalizacion:
                pi_removibles = uow.productos.get_ingredientes_removibles(item.producto_id)
                removible_ids = {pi.ingrediente_id for pi in pi_removibles}
                for ing_id in item.personalizacion:
                    if ing_id not in removible_ids:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Ingrediente {ing_id} no es removible en '{producto.nombre}'"
                        )

            precio = (producto.precio_base * (1 + producto.markup_porcentaje / 100)).quantize(Decimal("0.01"))
            subtotal_snap = Decimal(str(item.cantidad)) * precio
            item_snapshots.append({
                "producto_id": item.producto_id,
                "cantidad": item.cantidad,
                "nombre_snapshot": producto.nombre,
                "precio_snapshot": precio,
                "subtotal_snap": subtotal_snap,
                "personalizacion": item.personalizacion,
            })

        # 4. Calcular totales
        subtotal = sum(s["subtotal_snap"] for s in item_snapshots)
        descuento = Decimal("0.00")
        costo_envio = Decimal("0.00") if data.forma_pago_codigo == "EFECTIVO" else settings.COSTO_ENVIO_DEFAULT
        total = subtotal - descuento + costo_envio

        # 5. Crear pedido
        pedido = Pedido(
            usuario_id=usuario_id,
            direccion_id=direccion_id,
            estado_codigo="PENDIENTE",
            forma_pago_codigo=data.forma_pago_codigo,
            subtotal=subtotal,
            descuento=descuento,
            costo_envio=costo_envio,
            total=total,
            notas=data.notas,
        )
        uow.pedidos.add(pedido)
        uow.pedidos.flush()
        uow.pedidos.refresh(pedido)

        # 6. Crear detalles
        for snap in item_snapshots:
            uow.pedidos.add_detalle(DetallePedido(pedido_id=pedido.id, **snap))
        uow.pedidos.flush()

        # 6b. Descontar stock
        uow.pedidos.flush()
        uow.session.refresh(pedido)
        _ajustar_stock(pedido, uow, signo=-1)
        uow.pedidos.flush()

        # 7. Registrar primer historial
        primer_historial = HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=None,
            estado_hacia="PENDIENTE",
            usuario_id=usuario_id,
            motivo=None,
        )
        uow.pedidos.add_historial(primer_historial)
        uow.pedidos.flush()

        # 8. Recargar con detalles e historial
        uow.session.expire(pedido)
        pedido = uow.pedidos.get_by_id(pedido.id)

        # 9. Si la forma de pago es MERCADOPAGO, crear el Pago asociado
        if data.forma_pago_codigo == "MERCADOPAGO":
            from ..pagos.service import PagoService
            pago = PagoService().crear_pago_para_pedido(uow, pedido)
            pedido._external_reference = pago.external_reference  # type: ignore[attr-defined]
        else:
            pedido._external_reference = None  # type: ignore[attr-defined]

        return pedido

    def list_user_pedidos(self, uow: UnitOfWork, usuario_id: int,
                          offset: int = 0, limit: int = 20,
                          solo_activos: bool | None = None) -> List[Pedido]:
        """Retorna los pedidos del usuario autenticado, paginados."""
        return uow.pedidos.list_by_user(usuario_id, offset, limit, solo_activos)

    def list_all_pedidos(self, uow: UnitOfWork, offset: int = 0, limit: int = 20,
                         usuario_id: int | None = None,
                         estado_codigo: str | None = None) -> List[Pedido]:
        """Retorna todos los pedidos (admin/staff), con filtros opcionales por usuario y estado."""
        return uow.pedidos.list_all(offset, limit, usuario_id, estado_codigo)

    def get_pedido_for_user(self, uow: UnitOfWork, pedido_id: int,
                            current_user_id: int, user_roles: list) -> Pedido:
        """Retorna el pedido si el usuario tiene acceso; lanza 404 si no pertenece ni tiene rol."""
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Pedido {pedido_id} no encontrado")
        if any(r in ROLES_PEDIDOS for r in user_roles):
            return pedido
        if pedido.usuario_id != current_user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail=f"Pedido {pedido_id} no encontrado")
        return pedido

    def cambiar_estado(self, uow: UnitOfWork, pedido_id: int, nuevo_estado: str,
                       current_user, motivo: str | None = None) -> Pedido:
        """Valida permisos y FSM, luego avanza el estado del pedido y registra historial."""
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Pedido no encontrado")

        roles = getattr(current_user, "roles", [])
        es_admin_o_pedidos = "ADMIN" in roles or "PEDIDOS" in roles

        # Validar permisos
        if nuevo_estado == "CANCELADO":
            puede = es_admin_o_pedidos or (
                pedido.estado_codigo in {"PENDIENTE", "CONFIRMADO"}
                and current_user.id == pedido.usuario_id
            )
            if not puede:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="No tenés permiso para cancelar este pedido")
        else:
            if not es_admin_o_pedidos:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                    detail="Solo ADMIN o PEDIDOS pueden avanzar el estado")

        # Validar FSM
        if not EstadoPedidoService.es_transicion_valida(pedido.estado_codigo, nuevo_estado):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Transición inválida: {pedido.estado_codigo} → {nuevo_estado}. "
                    f"Transiciones válidas: {EstadoPedidoService.get_transiciones_validas(pedido.estado_codigo)}"
                ),
            )

        # Validar motivo si cancela
        if nuevo_estado == "CANCELADO" and not motivo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="El motivo es obligatorio al cancelar")

        # Ejecutar cambio
        if nuevo_estado == "CANCELADO":
            _ajustar_stock(pedido, uow, signo=+1)
        estado_anterior = pedido.estado_codigo
        pedido.estado_codigo = nuevo_estado
        pedido.updated_at = datetime.utcnow()
        uow.pedidos.add(pedido)

        historial = HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=estado_anterior,
            estado_hacia=nuevo_estado,
            usuario_id=current_user.id,
            motivo=motivo,
        )
        uow.pedidos.add_historial(historial)
        uow.pedidos.flush()
        uow.session.refresh(pedido)
        return pedido

    def cambiar_estado_por_sistema(self, uow: UnitOfWork, pedido_id: int,
                                   nuevo_estado: str, motivo: str) -> None:
        """Avanza el estado de un pedido de forma silenciosa (sin validar permisos de usuario)."""
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            return  # silently ignore if not found

        if not EstadoPedidoService.es_transicion_valida(pedido.estado_codigo, nuevo_estado):
            return  # silently ignore invalid transition (no crash en webhook)

        if nuevo_estado == "CANCELADO":
            _ajustar_stock(pedido, uow, signo=+1)
        estado_anterior = pedido.estado_codigo
        pedido.estado_codigo = nuevo_estado
        pedido.updated_at = datetime.utcnow()
        uow.pedidos.add(pedido)

        historial = HistorialEstadoPedido(
            pedido_id=pedido.id,
            estado_desde=estado_anterior,
            estado_hacia=nuevo_estado,
            usuario_id=None,  # sistema
            motivo=motivo,
        )
        uow.pedidos.add_historial(historial)
        uow.pedidos.flush()

    def authenticate_ws_user(self, uow: UnitOfWork, email: str) -> tuple[int, list[str]]:
        """Returns (user_id, roles) or raises HTTPException 403 if user is missing or disabled."""
        user = uow.usuarios.get_by_username(email)
        if not user or user.disabled:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Usuario no autorizado")
        assert user.id is not None
        roles: list[str] = uow.usuarios.get_roles_for_user(user.id)
        return user.id, roles

    def can_subscribe_to_order(self, uow: UnitOfWork, user_id: int, roles: list[str], order_id: int) -> bool:
        """Returns True if user is allowed to subscribe to this order's WS feed."""
        if "ADMIN" in roles or "PEDIDOS" in roles:
            return True
        pedido = uow.pedidos.get_by_id(order_id)
        return pedido is not None and pedido.usuario_id == user_id

    def get_historial(self, uow: UnitOfWork, pedido_id: int, current_user):
        """Retorna el historial de estados de un pedido, validando acceso del usuario."""
        pedido = uow.pedidos.get_by_id(pedido_id)
        if not pedido:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Pedido no encontrado")

        roles = getattr(current_user, "roles", [])
        es_admin_o_pedidos = "ADMIN" in roles or "PEDIDOS" in roles

        if not es_admin_o_pedidos and pedido.usuario_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="No tenés acceso a este pedido")

        return uow.pedidos.get_historial_for_pedido(pedido_id)


async def emit_pedido_event(pedido_id: int, estado_codigo: str, data: dict) -> None:
    """
    Emits WebSocket events after a pedido state change.
    Must be called OUTSIDE the UoW context so WS failures never cause a rollback.
    """
    from ..core.websocket import manager

    event = _EVENTO_POR_ESTADO.get(estado_codigo)
    if not event:
        return

    roles = _ROLES_POR_ESTADO.get(estado_codigo, [])
    try:
        await manager.broadcast_to_roles(roles, event, data)
        if estado_codigo != "PENDIENTE":
            await manager.broadcast_to_order(pedido_id, event, data)
    except Exception:
        logger.exception("WS emit failed for pedido %s estado %s", pedido_id, estado_codigo)
