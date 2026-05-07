from typing import List
from sqlmodel import SQLModel


class CategoriaKPI(SQLModel):
    id: int
    nombre: str
    total_productos: int


class DashboardResponse(SQLModel):
    total_productos: int
    productos_stock_bajo: int
    productos_sin_stock: int
    valor_total_inventario: float
    top_categorias: List[CategoriaKPI]
