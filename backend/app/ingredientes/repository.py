from typing import List, Optional

from sqlalchemy import or_
from sqlmodel import Session, col, func, select

from .model import Ingrediente


class IngredienteRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(
        self,
        offset: int,
        limit: int,
        q: Optional[str] = None,
        es_alergeno: Optional[bool] = None,
        sort: Optional[str] = None,
        order: str = "asc",
        include_deleted: bool = False,
    ) -> List[Ingrediente]:
        query = select(Ingrediente)
        if not include_deleted:
            query = query.where(col(Ingrediente.deleted_at).is_(None))

        q_norm = q.strip().lower() if q else None
        if q_norm:
            query = query.where(
                or_(
                    func.lower(col(Ingrediente.nombre)).contains(q_norm),
                    func.lower(func.coalesce(col(Ingrediente.descripcion), "")).contains(q_norm),
                )
            )

        if es_alergeno is not None:
            query = query.where(col(Ingrediente.es_alergeno) == es_alergeno)

        sort_map = {
            "nombre": col(Ingrediente.nombre),
            "created_at": col(Ingrediente.created_at),
        }
        sort_col = sort_map.get(sort or "")
        if sort_col is not None:
            query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        else:
            query = query.order_by(col(Ingrediente.id).asc())

        return self.session.exec(query.offset(offset).limit(limit)).all()

    def get_by_id(self, ingrediente_id: int) -> Optional[Ingrediente]:
        ing = self.session.get(Ingrediente, ingrediente_id)
        return ing if (ing and ing.deleted_at is None) else None

    def get_by_id_including_deleted(self, ingrediente_id: int) -> Optional[Ingrediente]:
        return self.session.get(Ingrediente, ingrediente_id)

    def get_by_nombre(self, nombre: str, exclude_id: Optional[int] = None) -> Optional[Ingrediente]:
        query = (
            select(Ingrediente)
            .where(Ingrediente.nombre == nombre)
            .where(col(Ingrediente.deleted_at).is_(None))
        )
        if exclude_id is not None:
            query = query.where(Ingrediente.id != exclude_id)
        return self.session.exec(query).first()

    def save(self, ingrediente: Ingrediente) -> None:
        self.session.add(ingrediente)
        self.session.flush()
        self.session.refresh(ingrediente)
