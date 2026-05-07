from typing import List, Optional

from sqlalchemy import or_
from sqlmodel import Session, col, func, select

from .model import Producto, ProductoCategoria, ProductoIngrediente
from ..categorias.model import Categoria
from ..categorias.repository import CategoriaRepository
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
        q: Optional[str] = None,
        precio_min: Optional[float] = None,
        precio_max: Optional[float] = None,
        stock_min: Optional[int] = None,
        stock_max: Optional[int] = None,
        in_stock: Optional[bool] = None,
        ingrediente_id: Optional[int] = None,
        sort: Optional[str] = None,
        order: str = "asc",
    ) -> List[Producto]:
        query = select(Producto).where(col(Producto.deleted_at).is_(None))

        q_norm = q.strip().lower() if q else None
        if q_norm:
            query = query.where(
                or_(
                    func.lower(col(Producto.nombre)).contains(q_norm),
                    func.lower(func.coalesce(col(Producto.descripcion), "")).contains(q_norm),
                )
            )

        if disponible is not None:
            query = query.where(Producto.disponible == disponible)
        
        # Rastrea si algún JOIN fue agregado (para aplicar DISTINCT solo cuando haga falta)
        needs_distinct = False

        if categoria_id is not None:
            if include_children:
                cat_repo = CategoriaRepository(self.session)
                categoria_ids = cat_repo.get_all_children_ids(categoria_id)
            else:
                categoria_ids = [categoria_id]

            query = query.join(
                ProductoCategoria,
                col(ProductoCategoria.producto_id) == col(Producto.id),
            ).where(col(ProductoCategoria.categoria_id).in_(categoria_ids))
            needs_distinct = True

        if ingrediente_id is not None:
            query = query.join(
                ProductoIngrediente,
                col(ProductoIngrediente.producto_id) == col(Producto.id),
            ).where(col(ProductoIngrediente.ingrediente_id) == ingrediente_id)
            needs_distinct = True

        if precio_min is not None:
            query = query.where(col(Producto.precio_base) >= precio_min)
        if precio_max is not None:
            query = query.where(col(Producto.precio_base) <= precio_max)

        if stock_min is not None:
            query = query.where(col(Producto.stock_cantidad) >= stock_min)
        if stock_max is not None:
            query = query.where(col(Producto.stock_cantidad) <= stock_max)
        if in_stock is not None:
            query = query.where(col(Producto.stock_cantidad) > 0 if in_stock else col(Producto.stock_cantidad) <= 0)

        # DISTINCT solo cuando hay JOIN que puede generar filas duplicadas.
        # No aplicarlo incondicionalmente: JSON no tiene operador de igualdad en Postgres.
        if needs_distinct:
            query = query.distinct()

        sort_map = {
            "nombre": col(Producto.nombre),
            "precio_base": col(Producto.precio_base),
            "created_at": col(Producto.created_at),
            "stock_cantidad": col(Producto.stock_cantidad),
        }
        sort_col = sort_map.get(sort or "")
        if sort_col is not None:
            query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        else:
            query = query.order_by(col(Producto.id).asc())

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
