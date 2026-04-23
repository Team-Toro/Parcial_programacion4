from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel
from pydantic import field_validator


class CategoriaBase(SQLModel):
    nombre: str
    descripcion: Optional[str] = None
    parent_id: Optional[int] = None
    orden_display: int = 0

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        if len(v) > 100:
            raise ValueError("El nombre no puede superar 100 caracteres")
        return v.strip()


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(SQLModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    parent_id: Optional[int] = None
    orden_display: Optional[int] = None


class CategoriaRead(CategoriaBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None


class CategoriaPublic(CategoriaBase):
    id: int
