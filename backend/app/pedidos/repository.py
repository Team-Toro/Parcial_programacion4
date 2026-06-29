from typing import List, Optional
from sqlmodel import Session, select, col
from .model import Pedido, DetallePedido, HistorialEstadoPedido


class PedidoRepository:
    def __init__(self, session: Session):
        self.session = session

    _TERMINALES = {"ENTREGADO", "CANCELADO"}

    def list_by_user(self, usuario_id: int, offset: int = 0, limit: int = 20,
                     solo_activos: Optional[bool] = None) -> List[Pedido]:
        query = (
            select(Pedido)
            .where(Pedido.usuario_id == usuario_id)
            .where(col(Pedido.deleted_at).is_(None))
        )
        if solo_activos is True:
            query = query.where(col(Pedido.estado_codigo).not_in(self._TERMINALES))
        elif solo_activos is False:
            query = query.where(col(Pedido.estado_codigo).in_(self._TERMINALES))
        pedidos = self.session.exec(
            query.order_by(col(Pedido.created_at).desc()).offset(offset).limit(limit)
        ).all()
        for p in pedidos:
            _ = p.detalles  # lazy load
        return pedidos

    def list_all(self, offset: int = 0, limit: int = 20,
                 usuario_id: Optional[int] = None,
                 estado_codigo: Optional[str] = None) -> List[Pedido]:
        query = select(Pedido).where(col(Pedido.deleted_at).is_(None))
        if usuario_id is not None:
            query = query.where(Pedido.usuario_id == usuario_id)
        if estado_codigo:
            query = query.where(Pedido.estado_codigo == estado_codigo)
        pedidos = self.session.exec(
            query.order_by(col(Pedido.created_at).desc()).offset(offset).limit(limit)
        ).all()
        for p in pedidos:
            _ = p.detalles  # lazy load
        return pedidos

    def get_by_id(self, pedido_id: int) -> Optional[Pedido]:
        pedido = self.session.exec(
            select(Pedido)
            .where(Pedido.id == pedido_id)
            .where(col(Pedido.deleted_at).is_(None))
        ).first()
        if pedido:
            _ = pedido.detalles   # lazy load
            _ = pedido.historial  # lazy load
        return pedido

    def add(self, pedido: Pedido) -> None:
        self.session.add(pedido)

    def add_detalle(self, detalle: DetallePedido) -> None:
        self.session.add(detalle)

    def add_historial(self, historial: HistorialEstadoPedido) -> None:
        self.session.add(historial)

    def get_historial_for_pedido(self, pedido_id: int) -> List[HistorialEstadoPedido]:
        return list(self.session.exec(
            select(HistorialEstadoPedido)
            .where(HistorialEstadoPedido.pedido_id == pedido_id)
            .order_by(col(HistorialEstadoPedido.created_at))
        ).all())

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, pedido: Pedido) -> None:
        self.session.refresh(pedido)

    def count_by_user(self, usuario_id: int) -> int:
        from sqlmodel import func
        return self.session.exec(
            select(func.count(Pedido.id))  # type: ignore[arg-type]
            .where(Pedido.usuario_id == usuario_id)
            .where(col(Pedido.deleted_at).is_(None))
        ).one()

    def count_all(self, usuario_id: Optional[int] = None, estado_codigo: Optional[str] = None) -> int:
        from sqlmodel import func
        query = select(func.count(Pedido.id)).where(col(Pedido.deleted_at).is_(None))  # type: ignore[arg-type]
        if usuario_id is not None:
            query = query.where(Pedido.usuario_id == usuario_id)
        if estado_codigo:
            query = query.where(Pedido.estado_codigo == estado_codigo)
        return self.session.exec(query).one()
