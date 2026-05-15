from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class PagoPublic(BaseModel):
    id: int
    pedido_id: int
    mp_payment_id: Optional[int]
    mp_status: str
    external_reference: str
    transaction_amount: Decimal
    payment_method_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookMockRequest(BaseModel):
    external_reference: str
    mp_status: str  # "approved" | "rejected" | "cancelled" | "pending"
    mp_payment_id: Optional[int] = None
    payment_method_id: Optional[str] = "visa"
