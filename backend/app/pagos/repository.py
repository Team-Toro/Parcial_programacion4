from typing import Optional
from sqlmodel import Session, select
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

    def add(self, pago: Pago) -> None:
        self.session.add(pago)
