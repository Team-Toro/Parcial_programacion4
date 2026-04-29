from typing import List, Optional
from sqlmodel import Session, select, col
from .model import Categoria

class CategoriaRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(self, offset: int, limit: int) -> List[Categoria]:
        """Obtiene todas las categorías activas con paginación."""
        return self.session.exec(
            select(Categoria)
            .where(col(Categoria.deleted_at).is_(None))
            .order_by(
                col(Categoria.parent_id).is_(None).desc(),
                col(Categoria.parent_id).asc(),
                Categoria.nombre.asc()
            )
            .offset(offset)
            .limit(limit)
        ).all()

    def get_by_id(self, categoria_id: int) -> Optional[Categoria]:
        """Obtiene una categoría por ID si no está eliminada."""
        cat = self.session.get(Categoria, categoria_id)
        return cat if (cat and cat.deleted_at is None) else None

    def get_by_nombre(self, nombre: str, exclude_id: Optional[int] = None) -> Optional[Categoria]:
        """Busca una categoría por nombre exacto."""
        query = (
            select(Categoria)
            .where(Categoria.nombre == nombre)
            .where(col(Categoria.deleted_at).is_(None))
        )
        if exclude_id is not None:
            query = query.where(Categoria.id != exclude_id)
        return self.session.exec(query).first()

    def get_subcategorias(self, categoria_id: int) -> List[Categoria]:
        """Obtiene las subcategorías directas de una categoría."""
        return self.session.exec(
            select(Categoria)
            .where(Categoria.parent_id == categoria_id)
            .where(col(Categoria.deleted_at).is_(None))
        ).all()

    def get_categoria_tree(self, categoria_id: int) -> List[Categoria]:
        """Obtiene la categoría y todas sus subcategorías (hijos directos)."""
        categoria = self.get_by_id(categoria_id)
        if not categoria:
            return []
        
        subcategorias = self.get_subcategorias(categoria_id)
        return [categoria] + subcategorias

    def has_circular_reference(self, categoria_id: int, new_parent_id: Optional[int]) -> bool:
        """Verifica si asignar new_parent_id crearía una referencia circular."""
        if new_parent_id is None:
            return False
        if new_parent_id == categoria_id:
            return True
        
        ancestors = self._get_ancestors(new_parent_id)
        return categoria_id in {cat.id for cat in ancestors}

    def _get_ancestors(self, categoria_id: int) -> List[Categoria]:
        """Obtiene todos los ancestros de una categoría (privado)."""
        ancestors = []
        current_id = categoria_id
        visited = set()
        
        while current_id and current_id not in visited:
            visited.add(current_id)
            cat = self.get_by_id(current_id)
            if not cat or not cat.parent_id:
                break
            ancestors.append(cat)
            current_id = cat.parent_id
        
        return ancestors

    def get_level(self, categoria_id: int) -> int:
        """Calcula el nivel de profundidad de una categoría."""
        ancestors = self._get_ancestors(categoria_id)
        return len(ancestors)

    def can_be_parent(self, categoria_id: int, max_level: int = 2) -> bool:
        """Verifica si una categoría puede tener hijos según el nivel máximo."""
        return self.get_level(categoria_id) < max_level

    def save(self, categoria: Categoria) -> Categoria:
        """Guarda una categoría (nueva o existente)."""
        self.session.add(categoria)
        return categoria

    def count_all(self) -> int:
        """Cuenta el total de categorías activas."""
        from sqlmodel import func
        return self.session.exec(
            select(func.count(Categoria.id))
            .where(col(Categoria.deleted_at).is_(None))
        ).one()