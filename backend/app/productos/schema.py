from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import field_validator, computed_field, ConfigDict
from ..categorias.schema import CategoriaRead, CategoriaPublic
from ..ingredientes.schema import IngredienteRead, IngredientePublic


class ProductoBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    precio_base: Decimal
    imagenes_url: Optional[List[str]] = None
    stock_cantidad: int = 0
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
    es_removible: bool = False
    cantidad: float = 1.0


class ProductoCreate(ProductoBase):
    categoria_ids: List[int] = []
    ingredientes: List[IngredienteEnProducto] = []


class ProductoUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio_base: Optional[Decimal] = None
    imagenes_url: Optional[List[str]] = None
    stock_cantidad: Optional[int] = None
    disponible: Optional[bool] = None
    categoria_ids: Optional[List[int]] = None
    ingredientes: Optional[List[IngredienteEnProducto]] = None


class ProductoDisponibilidadUpdate(SQLModel):
    disponible: bool


class ImagenProductoUpdate(SQLModel):
    imagenes_url: List[str]


class ProductoCategoriaRead(SQLModel):
    categoria: Optional[CategoriaRead] = None
    es_principal: bool = False


class IngredienteConDetalles(SQLModel):
    ingrediente: IngredienteRead
    es_removible: bool
    cantidad: float = 1.0


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
    cantidad: float = 1.0


class ProductoPublic(ProductoBase):
    id: int
    categorias: List[ProductoCategoriaPublic] = []
    ingredientes: List[IngredienteConDetallesPublic] = []
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def stock_disponible(self) -> int:
        if not self.ingredientes:
            return self.stock_cantidad
        posibles = []
        for item in self.ingredientes:
            if item.cantidad <= 0 or item.ingrediente.stock_actual <= 0:
                return 0
            if item.ingrediente.deleted_at is not None:
                return 0
            posibles.append(int(item.ingrediente.stock_actual / item.cantidad))
        return min(posibles) if posibles else 0
