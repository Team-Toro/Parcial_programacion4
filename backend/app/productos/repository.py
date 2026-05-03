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
                from ..categorias.repository import CategoriaRepository
                cat_repo = CategoriaRepository(self.session)
                categoria_ids = cat_repo.get_all_children_ids(categoria_id)
            else:
                categoria_ids = [categoria_id]
            
            query = query.join(ProductoCategoria).where(
                ProductoCategoria.categoria_id.in_(categoria_ids)
            )
        
        return self.session.exec(query.offset(offset).limit(limit)).all()

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
