from typing import List, Optional
from datetime import datetime
from sqlalchemy import update
from sqlmodel import Session, select, col
from .model import DireccionEntrega


class DireccionRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_by_user(self, usuario_id: int, include_deleted: bool = False) -> List[DireccionEntrega]:
        query = select(DireccionEntrega).where(DireccionEntrega.usuario_id == usuario_id)
        if not include_deleted:
            query = query.where(col(DireccionEntrega.deleted_at).is_(None))
        return self.session.exec(query.order_by(col(DireccionEntrega.es_principal).desc(), col(DireccionEntrega.created_at).asc())).all()

    def get_by_id(self, direccion_id: int, include_deleted: bool = False) -> Optional[DireccionEntrega]:
        direccion = self.session.get(DireccionEntrega, direccion_id)
        if not include_deleted:
            return direccion if (direccion and direccion.deleted_at is None) else None
        return direccion

    def get_by_id_for_user(self, direccion_id: int, usuario_id: int) -> Optional[DireccionEntrega]:
        return self.session.exec(
            select(DireccionEntrega)
            .where(DireccionEntrega.id == direccion_id)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(col(DireccionEntrega.deleted_at).is_(None))
        ).first()

    def add(self, direccion: DireccionEntrega) -> None:
        self.session.add(direccion)

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, direccion: DireccionEntrega) -> None:
        self.session.refresh(direccion)

    def unmark_principal_for_user(self, usuario_id: int) -> None:
        stmt = (
            update(DireccionEntrega)
            .where(DireccionEntrega.usuario_id == usuario_id)
            .where(col(DireccionEntrega.deleted_at).is_(None))
            .values(es_principal=False)
        )
        self.session.execute(stmt)

    def soft_delete(self, direccion: DireccionEntrega) -> None:
        now = datetime.utcnow()
        direccion.deleted_at = now
        direccion.updated_at = now
        self.session.add(direccion)
        self.session.flush()
