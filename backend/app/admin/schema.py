from pydantic import BaseModel


class EstadoCount(BaseModel):
    estado: str
    cantidad: int


class VentasPorDia(BaseModel):
    fecha: str
    total: float


class TopProducto(BaseModel):
    nombre: str
    total_unidades: int
    total_ventas: float


class PedidoReciente(BaseModel):
    id: int
    cliente: str
    email: str
    estado: str
    total: float
    created_at: str


class DashboardStats(BaseModel):
    ventas_totales: float
    pedidos_hoy: int
    pedidos_mes: int
    ticket_promedio: float
    total_clientes: int
    productos_activos: int
    estados: list[EstadoCount]
    ventas_por_dia: list[VentasPorDia]
    top_productos: list[TopProducto]
    pedidos_recientes: list[PedidoReciente]
