from typing import Optional
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, Integer, BigInteger, Numeric, String, ForeignKey
from sqlmodel import SQLModel, Field


class Pago(SQLModel, table=True):
    __tablename__ = "pagos"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(
        sa_column=Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    )

    # Monto del pedido
    transaction_amount: Decimal = Field(
        default=Decimal("0.00"),
        sa_column=Column(Numeric(10, 2), nullable=False),
    )

    # Estado nativo de MP: "pending" | "approved" | "rejected" | "cancelled" | ...
    mp_status: str = Field(default="pending", max_length=30, nullable=False)
    mp_status_detail: Optional[str] = Field(default=None, max_length=100)

    # external_reference = str(pedido_id) — enviado a MP, vuelve en webhook
    external_reference: str = Field(max_length=100, nullable=False)

    # Preferencia (se llena al llamar POST /pagos/create-preference)
    mp_preference_id: Optional[str] = Field(
        default=None,
        sa_column=Column(String(200), index=True, nullable=True),
    )
    mp_init_point: Optional[str] = Field(default=None, max_length=500)

    # Pago efectivo (se llena desde webhook o confirm)
    mp_payment_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, index=True, nullable=True),
    )
    mp_merchant_order_id: Optional[int] = Field(
        default=None,
        sa_column=Column(BigInteger, index=True, nullable=True),
    )
    payment_method_id: Optional[str] = Field(default=None, max_length=50)

    # Idempotencia
    idempotency_key: str = Field(max_length=100, nullable=False)

    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
