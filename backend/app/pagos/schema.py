from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class PagoPublic(BaseModel):
    id: int
    pedido_id: int
    transaction_amount: Decimal
    mp_status: str
    mp_status_detail: Optional[str] = None
    external_reference: str
    mp_preference_id: Optional[str] = None
    mp_init_point: Optional[str] = None
    mp_payment_id: Optional[int] = None
    mp_merchant_order_id: Optional[int] = None
    payment_method_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrearPreferenciaRequest(BaseModel):
    pedido_id: int


class ConfirmarPagoRequest(BaseModel):
    pedido_id: int
    payment_id: Optional[int] = None


class PagoCrearResponse(BaseModel):
    pago_id: int
    preference_id: str
    init_point: str
    public_key: Optional[str] = None


class PagoEstadoResponse(BaseModel):
    estado: str
    pedido_id: int
