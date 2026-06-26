from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from sqlmodel import SQLModel


class HistorialEstadoPedidoPublic(BaseModel):
    id: int
    estado_desde: Optional[str]
    estado_hacia: str
    usuario_id: Optional[int]
    motivo: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CambioEstadoRequest(BaseModel):
    nuevo_estado: str
    motivo: Optional[str] = None


class CancelarPedidoRequest(BaseModel):
    motivo: str = Field(min_length=1)


class ItemPedidoRequest(SQLModel):
    producto_id: int
    cantidad: int = Field(ge=1)
    personalizacion: Optional[List[int]] = None


class PedidoCreate(SQLModel):
    direccion_id: Optional[int] = None
    forma_pago_codigo: str
    notas: Optional[str] = None
    items: List[ItemPedidoRequest] = Field(min_length=1)


class DetallePedidoPublic(BaseModel):
    producto_id: int
    cantidad: int
    nombre_snapshot: str
    precio_snapshot: Decimal
    subtotal_snap: Decimal
    personalizacion: Optional[List[int]]
    personalizacion_snapshot: Optional[List[dict]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PedidoPublic(BaseModel):
    id: int
    usuario_id: int
    direccion_id: Optional[int]
    estado_codigo: str
    forma_pago_codigo: str
    subtotal: Decimal
    descuento: Decimal
    costo_envio: Decimal
    total: Decimal
    notas: Optional[str]
    detalles: List[DetallePedidoPublic]
    historial: List[HistorialEstadoPedidoPublic] = []
    created_at: datetime
    updated_at: datetime
    external_reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
