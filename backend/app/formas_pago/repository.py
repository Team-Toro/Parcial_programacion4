from typing import List, Optional
from sqlmodel import Session, select, col
from .model import FormaPago


class FormaPagoRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_all(self, only_habilitadas: bool = False) -> List[FormaPago]:
        query = select(FormaPago)
        if only_habilitadas:
            query = query.where(FormaPago.habilitado == True)  # noqa: E712
        return self.session.exec(query.order_by(col(FormaPago.codigo).asc())).all()

    def get_by_codigo(self, codigo: str) -> Optional[FormaPago]:
        return self.session.get(FormaPago, codigo)
