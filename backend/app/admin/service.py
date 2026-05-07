from typing import List
from sqlmodel import col, func, select
from ..uow.unit_of_work import UnitOfWork
from ..productos.model import Producto, ProductoCategoria
from ..categorias.model import Categoria
from .schema import DashboardResponse, CategoriaKPI


class AdminService:

    def get_dashboard(self, uow: UnitOfWork) -> DashboardResponse:
        session = uow.session

        total_productos = session.exec(
            select(func.count(col(Producto.id)))
            .where(col(Producto.deleted_at).is_(None))
        ).one()

        productos_stock_bajo = session.exec(
            select(func.count(col(Producto.id)))
            .where(
                col(Producto.deleted_at).is_(None),
                col(Producto.stock_cantidad) < 10,
                col(Producto.stock_cantidad) > 0,
            )
        ).one()

        productos_sin_stock = session.exec(
            select(func.count(col(Producto.id)))
            .where(
                col(Producto.deleted_at).is_(None),
                col(Producto.stock_cantidad) == 0,
            )
        ).one()

        valor_total = session.exec(
            select(func.sum(col(Producto.precio_base) * col(Producto.stock_cantidad)))
            .where(col(Producto.deleted_at).is_(None))
        ).one() or 0

        top_categorias_raw = session.exec(
            select(
                Categoria.id,
                Categoria.nombre,
                func.count(col(ProductoCategoria.producto_id)).label("total_productos"),
            )
            .join(ProductoCategoria, col(ProductoCategoria.categoria_id) == col(Categoria.id))
            .join(Producto, col(Producto.id) == col(ProductoCategoria.producto_id))
            .where(
                col(Categoria.deleted_at).is_(None),
                col(Producto.deleted_at).is_(None),
            )
            .group_by(Categoria.id, Categoria.nombre)
            .order_by(func.count(col(ProductoCategoria.producto_id)).desc())
            .limit(5)
        ).all()

        top_categorias = [
            CategoriaKPI(id=row[0], nombre=row[1], total_productos=row[2])
            for row in top_categorias_raw
        ]

        return DashboardResponse(
            total_productos=total_productos,
            productos_stock_bajo=productos_stock_bajo,
            productos_sin_stock=productos_sin_stock,
            valor_total_inventario=float(valor_total),
            top_categorias=top_categorias,
        )
