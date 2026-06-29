from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, ForeignKey, Integer, JSON, Numeric, String
from sqlmodel import SQLModel, Field, Relationship


class Pedido(SQLModel, table=True):
    __tablename__ = "pedidos"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", nullable=False)
    direccion_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("direcciones_entrega.id", ondelete="SET NULL"), nullable=True)
    )
    estado_codigo: str = Field(foreign_key="estados_pedido.codigo", max_length=20, nullable=False)
    forma_pago_codigo: str = Field(foreign_key="formas_pago.codigo", max_length=20, nullable=False)
    subtotal: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(10, 2), nullable=False))
    descuento: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(10, 2), nullable=False))
    costo_envio: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(10, 2), nullable=False))
    total: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(10, 2), nullable=False))
    notas: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    detalles: List["DetallePedido"] = Relationship(back_populates="pedido")
    historial: List["HistorialEstadoPedido"] = Relationship(
        back_populates="pedido",
        sa_relationship_kwargs={"order_by": "HistorialEstadoPedido.created_at"},
    )


class DetallePedido(SQLModel, table=True):
    __tablename__ = "detalle_pedidos"

    pedido_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), primary_key=True, nullable=False)
    )
    producto_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("productos.id", ondelete="RESTRICT"), primary_key=True, nullable=False)
    )
    cantidad: int = Field(ge=1, nullable=False)
    nombre_snapshot: str = Field(max_length=200, nullable=False)
    precio_snapshot: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(10, 2), nullable=False))
    subtotal_snap: Decimal = Field(default=Decimal("0.00"), sa_column=Column(Numeric(10, 2), nullable=False))
    personalizacion: Optional[List[int]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    personalizacion_snapshot: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    pedido: Optional["Pedido"] = Relationship(back_populates="detalles")


class HistorialEstadoPedido(SQLModel, table=True):
    __tablename__ = "historial_estados_pedido"

    id: Optional[int] = Field(default=None, primary_key=True)
    pedido_id: int = Field(
        sa_column=Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    )
    estado_desde: Optional[str] = Field(
        default=None,
        sa_column=Column(String(20), ForeignKey("estados_pedido.codigo"), nullable=True),
    )
    estado_hacia: str = Field(
        sa_column=Column(String(20), ForeignKey("estados_pedido.codigo"), nullable=False)
    )
    usuario_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("usuarios.id"), nullable=True),
    )
    motivo: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    pedido: Optional["Pedido"] = Relationship(back_populates="historial")
