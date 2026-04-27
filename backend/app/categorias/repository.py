from typing import List, Optional
from sqlmodel import Session, select
from .model import Categoria


class CategoriaRepository:
    def __init__(self, session: Session):
        self.session = session

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
            .order_by(
                Categoria.parent_id.is_(None).desc(),
                Categoria.parent_id.asc().nulls_last(),
                Categoria.nombre.asc()
            )
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

    def get_subcategorias(self, categoria_id: int) -> List[Categoria]:
        return self.session.exec(
            select(Categoria)
            .where(Categoria.parent_id == categoria_id)
            .where(Categoria.deleted_at == None)
        ).all()

    def has_circular_reference(self, categoria_id: int, new_parent_id: Optional[int]) -> bool:
        if new_parent_id is None:
            return False
        if new_parent_id == categoria_id:
            return True
        
        visited = set()
        current_id = new_parent_id
        while current_id:
            if current_id in visited:
                return True
            if current_id == categoria_id:
                return True
            visited.add(current_id)
            parent = self.get_by_id(current_id)
            current_id = parent.parent_id if parent else None
        
        return False

    def get_level(self, categoria_id: int) -> int:
        level = 0
        current = self.get_by_id(categoria_id)
        while current and current.parent_id:
            level += 1
            current = self.get_by_id(current.parent_id)
        return level

    def can_be_parent(self, categoria_id: int, max_level: int = 2) -> bool:
        return self.get_level(categoria_id) < max_level

    def save(self, categoria: Categoria) -> None:
        self.session.add(categoria)
        self.session.flush()
        self.session.refresh(categoria)
