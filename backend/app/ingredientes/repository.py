from typing import List, Optional
from sqlmodel import Session, select
from .model import Ingrediente


class IngredienteRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(self, offset: int, limit: int) -> List[Ingrediente]:
        return self.session.exec(
            select(Ingrediente)
            .where(Ingrediente.deleted_at == None)
            .offset(offset)
            .limit(limit)
        ).all()

    def get_by_id(self, ingrediente_id: int) -> Optional[Ingrediente]:
        ing = self.session.get(Ingrediente, ingrediente_id)
        return ing if (ing and ing.deleted_at is None) else None

    def get_by_nombre(self, nombre: str, exclude_id: Optional[int] = None) -> Optional[Ingrediente]:
        query = (
            select(Ingrediente)
            .where(Ingrediente.nombre == nombre)
            .where(Ingrediente.deleted_at == None)
        )
        if exclude_id is not None:
            query = query.where(Ingrediente.id != exclude_id)
        return self.session.exec(query).first()

    def save(self, ingrediente: Ingrediente) -> None:
        self.session.add(ingrediente)
        self.session.flush()
        self.session.refresh(ingrediente)
