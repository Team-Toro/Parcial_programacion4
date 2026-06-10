"""Lógica de negocio para el dashboard de administración."""

from datetime import date, timedelta

from sqlalchemy import text

from app.admin.schema import (
    DashboardStats,
    EstadoCount,
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
        session = uow.session
        hoy = date.today()
        primer_dia_mes = hoy.replace(day=1)
        inicio_14_dias = hoy - timedelta(days=13)

        # ── KPIs ──────────────────────────────────────────────────────────────

        ventas_totales = session.execute(
            text(
                "SELECT COALESCE(SUM(total), 0) FROM pedidos "
                "WHERE estado_codigo != 'CANCELADO' AND deleted_at IS NULL"
            )
        ).scalar() or 0

        pedidos_hoy = session.execute(
            text(
                "SELECT COUNT(id) FROM pedidos "
                "WHERE estado_codigo != 'CANCELADO' AND deleted_at IS NULL "
                "AND DATE(created_at) = :hoy"
            ),
            {"hoy": hoy},
        ).scalar() or 0

        pedidos_mes = session.execute(
            text(
                "SELECT COUNT(id) FROM pedidos "
                "WHERE estado_codigo != 'CANCELADO' AND deleted_at IS NULL "
                "AND created_at >= :primer_dia"
            ),
            {"primer_dia": primer_dia_mes},
        ).scalar() or 0

        ticket_promedio = session.execute(
            text(
                "SELECT COALESCE(AVG(total), 0) FROM pedidos "
                "WHERE estado_codigo != 'CANCELADO' AND deleted_at IS NULL"
            )
        ).scalar() or 0

        total_clientes = session.execute(
            text(
                "SELECT COUNT(id) FROM usuarios "
                "WHERE deleted_at IS NULL "
                "AND id NOT IN ("
                "  SELECT usuario_id FROM usuario_rol "
                "  WHERE role_id IN ('ADMIN', 'STOCK', 'PEDIDOS')"
                ")"
            )
        ).scalar() or 0

        productos_activos = session.execute(
            text(
                "SELECT COUNT(id) FROM productos "
                "WHERE disponible = TRUE AND deleted_at IS NULL"
            )
        ).scalar() or 0

        # ── Pedidos por estado ─────────────────────────────────────────────────

        estados_rows = session.execute(
            text(
                "SELECT estado_codigo, COUNT(id) "
                "FROM pedidos WHERE deleted_at IS NULL "
                "GROUP BY estado_codigo ORDER BY COUNT(id) DESC"
            )
        ).fetchall()
        estados = [EstadoCount(estado=r[0], cantidad=r[1]) for r in estados_rows]

        # ── Ventas por día (últimos 14 días) ───────────────────────────────────

        ventas_rows = session.execute(
            text(
                "SELECT DATE(created_at) AS fecha, COALESCE(SUM(total), 0) AS total "
                "FROM pedidos "
                "WHERE estado_codigo != 'CANCELADO' AND deleted_at IS NULL "
                "  AND created_at >= :inicio "
                "GROUP BY DATE(created_at) "
                "ORDER BY DATE(created_at)"
            ),
            {"inicio": inicio_14_dias},
        ).fetchall()
        ventas_por_dia = [VentasPorDia(fecha=str(r[0]), total=float(r[1])) for r in ventas_rows]

        # ── Top 5 productos ────────────────────────────────────────────────────

        top_rows = session.execute(
            text(
                "SELECT dp.nombre_snapshot, "
                "       SUM(dp.cantidad) AS total_unidades, "
                "       COALESCE(SUM(dp.subtotal_snap), 0) AS total_ventas "
                "FROM detalle_pedidos dp "
                "JOIN pedidos p ON dp.pedido_id = p.id "
                "WHERE p.estado_codigo != 'CANCELADO' AND p.deleted_at IS NULL "
                "GROUP BY dp.nombre_snapshot "
                "ORDER BY total_unidades DESC "
                "LIMIT 5"
            )
        ).fetchall()
        top_productos = [
            TopProducto(nombre=r[0], total_unidades=int(r[1]), total_ventas=float(r[2]))
            for r in top_rows
        ]

        # ── Últimos 10 pedidos ─────────────────────────────────────────────────

        recientes_rows = session.execute(
            text(
                "SELECT p.id, "
                "       CONCAT(u.first_name, ' ', u.last_name) AS cliente, "
                "       u.email, p.estado_codigo, p.total, p.created_at "
                "FROM pedidos p "
                "JOIN usuarios u ON p.usuario_id = u.id "
                "WHERE p.deleted_at IS NULL "
                "ORDER BY p.created_at DESC "
                "LIMIT 10"
            )
        ).fetchall()
        pedidos_recientes = [
            PedidoReciente(
                id=r[0],
                cliente=r[1],
                email=r[2],
                estado=r[3],
                total=float(r[4]),
                created_at=str(r[5]),
            )
            for r in recientes_rows
        ]

        return DashboardStats(
            ventas_totales=float(ventas_totales),
            pedidos_hoy=int(pedidos_hoy),
            pedidos_mes=int(pedidos_mes),
            ticket_promedio=float(ticket_promedio),
            total_clientes=int(total_clientes),
            productos_activos=int(productos_activos),
            estados=estados,
            ventas_por_dia=ventas_por_dia,
            top_productos=top_productos,
            pedidos_recientes=pedidos_recientes,
        )
