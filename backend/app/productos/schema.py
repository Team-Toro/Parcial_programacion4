from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import field_validator
from ..categorias.schema import CategoriaRead, CategoriaPublic
from ..ingredientes.schema import IngredienteRead, IngredientePublic


class ProductoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    precio_base: Decimal
    imagenes_url: Optional[List[str]] = None
    tiempo_prep_min: Optional[int] = None
    disponible: bool = True

    @field_validator("precio_base")
    @classmethod
    def precio_positivo(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("El precio no puede ser negativo")
        return v

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()


class IngredienteEnProducto(SQLModel):
    ingrediente_id: int
    es_removible: bool
    es_opcional: bool = False


class ProductoCreate(ProductoBase):
    categoria_ids: List[int] = []
    ingredientes: List[IngredienteEnProducto] = []


class ProductoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = None
    imagenes_url: Optional[List[str]] = None
    tiempo_prep_min: Optional[int] = None
    disponible: Optional[bool] = None
    categoria_ids: Optional[List[int]] = None
    ingredientes: Optional[List[IngredienteEnProducto]] = None


class ProductoCategoriaRead(SQLModel):
    categoria: Optional[CategoriaRead] = None
    es_principal: bool = False


class IngredienteConDetalles(SQLModel):
    ingrediente: IngredienteRead
    es_removible: bool
    es_opcional: bool


class ProductoRead(ProductoBase):
    id: int
    categorias: List[ProductoCategoriaRead] = []
    ingredientes: List[IngredienteConDetalles] = []
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None


class ProductoCategoriaPublic(SQLModel):
    categoria: Optional[CategoriaPublic] = None
    es_principal: bool = False


class IngredienteConDetallesPublic(SQLModel):
    ingrediente: IngredientePublic
    es_removible: bool
    es_opcional: bool


class ProductoPublic(ProductoBase):
    id: int
    categorias: List[ProductoCategoriaPublic] = []
    ingredientes: List[IngredienteConDetallesPublic] = []
