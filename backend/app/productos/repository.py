from typing import List, Optional
from sqlmodel import Session, select
from .model import Producto, ProductoCategoria, ProductoIngrediente
from ..categorias.model import Categoria
from ..ingredientes.model import Ingrediente


class ProductoRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_all(
        self,
        offset: int,
        limit: int,
        disponible: Optional[bool] = None,
        categoria_id: Optional[int] = None,
        include_children: bool = True,
    ) -> List[Producto]:
        query = select(Producto).where(Producto.deleted_at == None)
        if disponible is not None:
            query = query.where(Producto.disponible == disponible)
        
        if categoria_id is not None:
            if include_children:
                categoria_ids = self._get_categoria_and_children_ids(categorias)
            else:
                categoria_ids = [categoria_id]
            
            query = query.join(ProductoCategoria).where(
                ProductoCategoria.categoria_id.in_(categoria_ids)
            )
        
        return self.session.exec(query.offset(offset).limit(limit)).all()

    def _get_categoria_and_children_ids(self, categoria_id: int) -> List[int]:
        ids = [categoria_id]
        self._collect_children_ids(categoria_id, ids)
        return ids

    def _collect_children_ids(self, parent_id: int, ids: List[int]) -> None:
        children = self.session.exec(
            select(Categoria.id).where(
                Categoria.parent_id == parent_id,
                Categoria.deleted_at == None
            )
        ).all()
        for child_id in children:
            if child_id not in ids:
                ids.append(child_id)
                self._collect_children_ids(child_id, ids)

    def get_by_id(self, producto_id: int) -> Optional[Producto]:
        p = self.session.get(Producto, producto_id)
        return p if (p and p.deleted_at is None) else None

    def get_categoria(self, categoria_id: int) -> Optional[Categoria]:
        return self.session.get(Categoria, categoria_id)

    def get_ingrediente(self, ingrediente_id: int) -> Optional[Ingrediente]:
        return self.session.get(Ingrediente, ingrediente_id)

    def get_categorias_pivot(self, producto_id: int) -> List[ProductoCategoria]:
        return self.session.exec(
            select(ProductoCategoria).where(ProductoCategoria.producto_id == producto_id)
        ).all()

    def get_ingredientes_pivot(self, producto_id: int) -> List[ProductoIngrediente]:
        return self.session.exec(
            select(ProductoIngrediente).where(ProductoIngrediente.producto_id == producto_id)
        ).all()

    def add(self, obj) -> None:
        self.session.add(obj)

    def delete(self, obj) -> None:
        self.session.delete(obj)

    def flush(self) -> None:
        self.session.flush()

    def refresh(self, obj) -> None:
        self.session.refresh(obj)
