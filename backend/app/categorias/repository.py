from typing import List, Optional
from sqlalchemy import or_
from sqlmodel import Session, select, col, func
from .model import Categoria
from ..productos.model import ProductoCategoria

class CategoriaRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(
        self,
        offset: int,
        limit: int,
        q: Optional[str] = None,
        parent_id: Optional[int] = None,
        only_roots: bool = False,
        sort: Optional[str] = None,
        order: str = "asc",
        include_deleted: bool = False,
    ) -> List[Categoria]:
        """Obtiene categorías con paginación y filtros."""
        query = select(Categoria)
        if not include_deleted:
            query = query.where(col(Categoria.deleted_at).is_(None))

        q_norm = q.strip().lower() if q else None
        if q_norm:
            query = query.where(
                or_(
                    func.lower(col(Categoria.nombre)).contains(q_norm),
                    func.lower(func.coalesce(col(Categoria.descripcion), "")).contains(q_norm),
                )
            )

        if only_roots:
            query = query.where(col(Categoria.parent_id).is_(None))
        elif parent_id is not None:
            query = query.where(col(Categoria.parent_id) == parent_id)

        sort_map = {
            "nombre": col(Categoria.nombre),
            "created_at": col(Categoria.created_at),
            "parent_id": col(Categoria.parent_id),
        }
        sort_col = sort_map.get(sort or "")
        if sort_col is not None:
            query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        else:
            # Default: roots first, then by parent, then by name.
            query = query.order_by(
                col(Categoria.parent_id).is_(None).desc(),
                col(Categoria.parent_id).asc(),
                col(Categoria.nombre).asc(),
            )

        return self.session.exec(query.offset(offset).limit(limit)).all()

    def get_by_id(self, categoria_id: int) -> Optional[Categoria]:
        """Obtiene una categoría por ID si no está eliminada."""
        cat = self.session.get(Categoria, categoria_id)
        return cat if (cat and cat.deleted_at is None) else None

    def get_any_by_id(self, categoria_id: int) -> Optional[Categoria]:
        """Obtiene una categoría por ID sin importar si está eliminada."""
        return self.session.get(Categoria, categoria_id)

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

    def get_all_children_ids(self, categoria_id: int) -> List[int]:
        """Obtiene el ID de la categoría y todos sus descendientes."""
        ids = [categoria_id]
        self._collect_children_ids(categoria_id, ids)
        return ids

    def _collect_children_ids(self, parent_id: int, ids: List[int]) -> None:
        children = self.session.exec(
            select(Categoria.id).where(
                Categoria.parent_id == parent_id,
                col(Categoria.deleted_at).is_(None)
            )
        ).all()
        for child_id in children:
            if child_id not in ids:
                ids.append(child_id)
                self._collect_children_ids(child_id, ids)

    def save(self, categoria: Categoria) -> Categoria:
        """Guarda una categoría (nueva o existente)."""
        self.session.add(categoria)
        self.session.flush()  # asigna id antes de serializar
        return categoria

    def count_subcategorias(self, categoria_id: int) -> int:
        """Cuenta las subcategorías directas de una categoría."""
        return self.session.exec(
            select(func.count(Categoria.id))
            .where(Categoria.parent_id == categoria_id)
            .where(col(Categoria.deleted_at).is_(None))
        ).one()

    def count_productos(self, categoria_id: int) -> int:
        """Cuenta los productos asociados a una categoría."""
        return self.session.exec(
            select(func.count(ProductoCategoria.producto_id))
            .where(ProductoCategoria.categoria_id == categoria_id)
        ).one()

    def get_productos_relaciones(self, categoria_id: int):
        """Obtiene las relaciones de productos con esta categoría."""
        return self.session.exec(
            select(ProductoCategoria)
            .where(ProductoCategoria.categoria_id == categoria_id)
        ).all()

    def count_all(self) -> int:
        """Cuenta el total de categorías activas."""
        return self.session.exec(
            select(func.count(Categoria.id))
            .where(col(Categoria.deleted_at).is_(None))
        ).one()
