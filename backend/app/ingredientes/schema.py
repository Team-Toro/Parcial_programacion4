from typing import Optional
from decimal import Decimal
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import field_validator, ValidationInfo
from .model import UnidadMedida


class IngredienteBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    es_alergeno: bool = False
    unidad: UnidadMedida = UnidadMedida.UNIDAD
    stock_actual: float = 0.0
    precio: Decimal = Decimal("0.00")

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("stock_actual")
    @classmethod
    def stock_entero_si_unidad(cls, v: float, info: ValidationInfo) -> float:
        if info.data.get("unidad") == UnidadMedida.UNIDAD and v != int(v):
            raise ValueError("stock_actual debe ser un número entero cuando la unidad es 'unidad'")
        return v


class IngredienteCreate(IngredienteBase):
    pass


class IngredienteUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    es_alergeno: Optional[bool] = None
    unidad: Optional[UnidadMedida] = None
    stock_actual: Optional[float] = None
    precio: Optional[Decimal] = None

    @field_validator("stock_actual")
    @classmethod
    def stock_entero_si_unidad(cls, v: Optional[float], info: ValidationInfo) -> Optional[float]:
        if v is not None and info.data.get("unidad") == UnidadMedida.UNIDAD and v != int(v):
            raise ValueError("stock_actual debe ser un número entero cuando la unidad es 'unidad'")
        return v


class IngredienteRead(IngredienteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None


class IngredientePublic(IngredienteBase):
    id: int
    deleted_at: Optional[datetime] = None
