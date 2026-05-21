from typing import Optional
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, Numeric, ForeignKey
from sqlmodel import SQLModel, Field


class Pago(SQLModel, table=True):
    __tablename__ = "pagos"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(
        sa_column=Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    )
    mp_payment_id: Optional[int] = Field(default=None)
    mp_status: str = Field(max_length=30, nullable=False)
    topic_payment: str = Field(default="payment", max_length=20, nullable=False)
    external_reference: str = Field(max_length=100, nullable=False)
    idempotency_key: str = Field(max_length=100, nullable=False)
    transaction_amount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(10, 2), nullable=False)
    )
    payment_method_id: Optional[str] = Field(default=None, max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
