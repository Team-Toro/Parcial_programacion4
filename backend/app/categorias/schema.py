from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict

class CategoriaBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre de la categoría")
    descripcion: Optional[str] = Field(None, max_length=500, description="Descripción opcional")
    parent_id: Optional[int] = Field(None, ge=1, description="ID de la categoría padre")
    imagen_url: Optional[str] = Field(None, max_length=500, description="URL de la imagen")

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("El nombre no puede estar vacío")
        return v_stripped


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(CategoriaBase):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    descripcion: Optional[str] = None
    parent_id: Optional[int] = None
    imagen_url: Optional[str] = None


class CategoriaRead(CategoriaBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CategoriaPublic(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    parent_id: Optional[int] = None
    imagen_url: Optional[str] = None
    subcategorias: List["CategoriaPublic"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CategoriaStats(BaseModel):
    subcategorias_count: int = Field(..., ge=0, description="Número de subcategorías directas")
    productos_count: int = Field(..., ge=0, description="Número de productos asociados")
    nivel: int = Field(..., ge=0, description="Nivel en la jerarquía (0 = raíz)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "subcategorias_count": 3,
                "productos_count": 15,
                "nivel": 1
            }
        }
    )