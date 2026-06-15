from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, PlainSerializer

Money = Annotated[Decimal, PlainSerializer(lambda v: str(v), return_type=str)]


class EstadoCount(BaseModel):
    estado: str
    cantidad: int


class VentasPorDia(BaseModel):
    fecha: str
    total: Money


class TopProducto(BaseModel):
    nombre: str
    total_unidades: int
    total_ventas: Money


class IngresoPorFormaPago(BaseModel):
    forma_pago_codigo: str
    cantidad_pedidos: int
    total_ingresos: Money


class PedidoReciente(BaseModel):
    id: int
    cliente: str
    email: str
    estado: str
    total: Money
    created_at: str


class DashboardStats(BaseModel):
    ventas_totales: Money
    pedidos_hoy: int
    pedidos_mes: int
    ticket_promedio: Money
    total_clientes: int
    productos_activos: int
    estados: list[EstadoCount]
    ventas_por_dia: list[VentasPorDia]
    top_productos: list[TopProducto]
    ingresos_por_forma_pago: list[IngresoPorFormaPago]
    pedidos_recientes: list[PedidoReciente]
