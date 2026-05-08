from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import field_validator
from .model import UnidadMedida


class IngredienteBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    es_alergeno: bool = False
    unidad: UnidadMedida = UnidadMedida.UNIDAD
    stock_actual: float = 0.0

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()


class IngredienteCreate(IngredienteBase):
    pass


class IngredienteUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    es_alergeno: Optional[bool] = None
    unidad: Optional[UnidadMedida] = None
    stock_actual: Optional[float] = None


class IngredienteRead(IngredienteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None


class IngredientePublic(IngredienteBase):
    id: int
    deleted_at: Optional[datetime] = None
