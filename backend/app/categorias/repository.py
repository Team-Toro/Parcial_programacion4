from typing import List, Optional
from sqlmodel import Session, select
from .model import Categoria


class CategoriaRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(self, offset: int, limit: int) -> List[Categoria]:
        return self.session.exec(
            select(Categoria)
            .where(Categoria.deleted_at == None)
            .offset(offset)
            .limit(limit)
        ).all()

    def get_by_id(self, categoria_id: int) -> Optional[Categoria]:
        cat = self.session.get(Categoria, categoria_id)
        return cat if (cat and cat.deleted_at is None) else None

    def get_by_nombre(self, nombre: str, exclude_id: Optional[int] = None) -> Optional[Categoria]:
        query = (
            select(Categoria)
            .where(Categoria.nombre == nombre)
            .where(Categoria.deleted_at == None)
        )
        if exclude_id is not None:
            query = query.where(Categoria.id != exclude_id)
        return self.session.exec(query).first()

    def save(self, categoria: Categoria) -> None:
        self.session.add(categoria)
        self.session.flush()
        self.session.refresh(categoria)
