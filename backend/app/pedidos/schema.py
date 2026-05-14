from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict
from sqlmodel import SQLModel


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
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
