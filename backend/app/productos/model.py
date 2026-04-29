from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON
from decimal import Decimal

if TYPE_CHECKING:
    from ..categorias.model import Categoria
    from ..ingredientes.model import Ingrediente


class ProductoCategoria(SQLModel, table=True):
    __tablename__ = "producto_categoria"
    producto_id: Optional[int] = Field(default=None, foreign_key="productos.id", primary_key=True)
    categoria_id: Optional[int] = Field(default=None, foreign_key="categorias.id", primary_key=True)
    es_principal: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    producto: Optional["Producto"] = Relationship(back_populates="categorias")
    categoria: Optional["Categoria"] = Relationship(back_populates="productos")


class ProductoIngrediente(SQLModel, table=True):
    __tablename__ = "producto_ingrediente"
    producto_id: Optional[int] = Field(default=None, foreign_key="productos.id", primary_key=True)
    ingrediente_id: Optional[int] = Field(default=None, foreign_key="ingredientes.id", primary_key=True)
    es_removible: bool = Field(default=False, nullable=False)
    producto: Optional["Producto"] = Relationship(back_populates="ingredientes")
    ingrediente: Optional["Ingrediente"] = Relationship(back_populates="productos")


class Producto(SQLModel, table=True):
    __tablename__ = "productos"
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=150, nullable=False)
    descripcion: Optional[str] = Field(default=None)
    precio_base: Decimal = Field(decimal_places=2, max_digits=10, ge=0)
    imagenes_url: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    stock_cantidad: int = Field(default=0, ge=0)
    disponible: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)
    categorias: List["ProductoCategoria"] = Relationship(back_populates="producto")
    ingredientes: List["ProductoIngrediente"] = Relationship(back_populates="producto")
