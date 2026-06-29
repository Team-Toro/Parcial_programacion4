"""Lógica de negocio para el dashboard de administración."""

from datetime import date, timedelta

from app.admin.repository import AdminRepository, _money
from app.admin.schema import (
    DashboardStats,
    EstadoCount,
    IngresoPorFormaPago,
    PedidoReciente,
    TopProducto,
    VentasPorDia,
)
from app.uow.unit_of_work import UnitOfWork


class AdminService:
    """Consultas agregadas para el dashboard de administración."""

    @staticmethod
    def get_stats(uow: UnitOfWork) -> DashboardStats:
        """Retorna todos los KPIs, gráficos y tablas del dashboard en una sola llamada."""
        repo = AdminRepository(uow.session)
        hoy = date.today()
        primer_dia_mes = hoy.replace(day=1)
        inicio_14_dias = hoy - timedelta(days=13)

        kpis = repo.get_kpis(hoy, primer_dia_mes)

        estados_rows = repo.get_estados()
        estados = [EstadoCount(estado=r[0], cantidad=r[1]) for r in estados_rows]

        ventas_rows = repo.get_ventas_por_dia(inicio_14_dias)
        ventas_por_dia = [VentasPorDia(fecha=str(r[0]), total=_money(r[1])) for r in ventas_rows]

        top_rows = repo.get_top_productos()
        top_productos = [
            TopProducto(nombre=r[0], total_unidades=int(r[1]), total_ventas=_money(r[2]))
            for r in top_rows
        ]

        ingresos_rows = repo.get_ingresos_por_forma_pago()
        ingresos_por_forma_pago = [
            IngresoPorFormaPago(
                forma_pago_codigo=r[0],
                cantidad_pedidos=int(r[1]),
                total_ingresos=_money(r[2]),
            )
            for r in ingresos_rows
        ]

        recientes_rows = repo.get_pedidos_recientes()
        pedidos_recientes = [
            PedidoReciente(
                id=r[0],
                cliente=r[1],
                email=r[2],
                estado=r[3],
                total=_money(r[4]),
                created_at=r[5].isoformat() if hasattr(r[5], 'isoformat') else str(r[5]),
            )
            for r in recientes_rows
        ]

        return DashboardStats(
            **kpis,
            estados=estados,
            ventas_por_dia=ventas_por_dia,
            top_productos=top_productos,
            ingresos_por_forma_pago=ingresos_por_forma_pago,
            pedidos_recientes=pedidos_recientes,
        )
