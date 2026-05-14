from typing import List, Optional
from sqlmodel import Session, select, col
from .model import EstadoPedido


class EstadoPedidoRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_all(self) -> List[EstadoPedido]:
        return self.session.exec(
            select(EstadoPedido).order_by(col(EstadoPedido.orden).asc())
        ).all()

    def get_by_codigo(self, codigo: str) -> Optional[EstadoPedido]:
        return self.session.get(EstadoPedido, codigo)
