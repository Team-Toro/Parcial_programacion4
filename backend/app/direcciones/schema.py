from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict


class DireccionCreate(BaseModel):
    alias: Optional[str] = Field(None, max_length=50)
    linea1: str = Field(..., min_length=1)
    linea2: Optional[str] = Field(None)
    ciudad: str = Field(..., min_length=1, max_length=100)
    provincia: Optional[str] = Field(None, max_length=100)
    codigo_postal: Optional[str] = Field(None, max_length=10)
    latitud: Optional[float] = Field(None, ge=-90, le=90)
    longitud: Optional[float] = Field(None, ge=-180, le=180)
    es_principal: bool = Field(False)

    @field_validator("linea1")
    @classmethod
    def linea1_no_vacia(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("La línea 1 no puede estar vacía")
        return v_stripped

    @field_validator("ciudad")
    @classmethod
    def ciudad_no_vacia(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("La ciudad no puede estar vacía")
        return v_stripped


class DireccionUpdate(BaseModel):
    alias: Optional[str] = Field(None, max_length=50)
    linea1: Optional[str] = Field(None, min_length=1)
    linea2: Optional[str] = Field(None)
    ciudad: Optional[str] = Field(None, min_length=1, max_length=100)
    provincia: Optional[str] = Field(None, max_length=100)
    codigo_postal: Optional[str] = Field(None, max_length=10)
    latitud: Optional[float] = Field(None, ge=-90, le=90)
    longitud: Optional[float] = Field(None, ge=-180, le=180)
    es_principal: Optional[bool] = Field(None)

    @field_validator("linea1")
    @classmethod
    def linea1_no_vacia(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("La línea 1 no puede estar vacía")
        return v_stripped

    @field_validator("ciudad")
    @classmethod
    def ciudad_no_vacia(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("La ciudad no puede estar vacía")
        return v_stripped


class DireccionPublic(BaseModel):
    id: int
    usuario_id: int
    alias: Optional[str] = None
    linea1: str
    linea2: Optional[str] = None
    ciudad: str
    provincia: Optional[str] = None
    codigo_postal: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    es_principal: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
