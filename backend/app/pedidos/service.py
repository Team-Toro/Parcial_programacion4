from typing import List
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status
from sqlmodel import select
from .model import Pedido, DetallePedido
from .schema import PedidoCreate
from ..uow.unit_of_work import UnitOfWork
from ..productos.model import Producto, ProductoIngrediente
from ..productos.service import calcular_stock_disponible
from ..core.config import settings

ROLES_PEDIDOS = {"ADMIN", "PEDIDOS"}


class PedidoService:

    def create(self, uow: UnitOfWork, usuario_id: int, data: PedidoCreate) -> Pedido:
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
            producto = uow.session.get(Producto, item.producto_id)
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
                pi_removibles = uow.session.exec(
                    select(ProductoIngrediente)
                    .where(ProductoIngrediente.producto_id == item.producto_id)
                    .where(ProductoIngrediente.es_removible == True)  # noqa: E712
                ).all()
                removible_ids = {pi.ingrediente_id for pi in pi_removibles}
                for ing_id in item.personalizacion:
                    if ing_id not in removible_ids:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Ingrediente {ing_id} no es removible en '{producto.nombre}'"
                        )

            precio = producto.precio_base
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

        # 7. Recargar con detalles
        uow.session.expire(pedido)
        return uow.pedidos.get_by_id(pedido.id)

    def list_user_pedidos(self, uow: UnitOfWork, usuario_id: int,
                          offset: int = 0, limit: int = 20) -> List[Pedido]:
        return uow.pedidos.list_by_user(usuario_id, offset, limit)

    def list_all_pedidos(self, uow: UnitOfWork, offset: int = 0, limit: int = 20,
                         usuario_id: int | None = None,
                         estado_codigo: str | None = None) -> List[Pedido]:
        return uow.pedidos.list_all(offset, limit, usuario_id, estado_codigo)

    def get_pedido_for_user(self, uow: UnitOfWork, pedido_id: int,
                            current_user_id: int, user_roles: list) -> Pedido:
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
