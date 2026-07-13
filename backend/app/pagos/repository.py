from typing import Optional
from sqlmodel import Session, select, col
from .model import Pago


class PagoRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_by_id(self, pago_id: int) -> Optional[Pago]:
        return self.session.exec(
            select(Pago).where(Pago.id == pago_id)
        ).first()

    def get_by_external_reference(self, ref: str) -> Optional[Pago]:
        return self.session.exec(
            select(Pago).where(Pago.external_reference == ref)
        ).first()

    def get_by_pedido_id(self, pedido_id: int) -> Optional[Pago]:
        return self.session.exec(
            select(Pago).where(Pago.pedido_id == pedido_id)
        ).first()

    def get_by_mp_payment_id(self, payment_id: int) -> Optional[Pago]:
        return self.session.exec(
            select(Pago).where(Pago.mp_payment_id == payment_id)
        ).first()

    def get_by_mp_merchant_order_id(self, merchant_order_id: int) -> Optional[Pago]:
        return self.session.exec(
            select(Pago).where(Pago.mp_merchant_order_id == merchant_order_id)
        ).first()

    def get_ultimo_by_pedido(self, pedido_id: int) -> Optional[Pago]:
        """Retorna el Pago más reciente para el pedido (por id desc)."""
        return self.session.exec(
            select(Pago)
            .where(Pago.pedido_id == pedido_id)
            .order_by(col(Pago.id).desc())
        ).first()

    def add(self, pago: Pago) -> None:
        self.session.add(pago)

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, pago: Pago) -> None:
        self.session.refresh(pago)
