"""Data access layer for admin dashboard queries."""

from datetime import date
from decimal import Decimal

from sqlalchemy import text
from sqlmodel import Session

_PAGO_CONFIRMADO = "(p.forma_pago_codigo != 'MERCADOPAGO' OR pg.mp_status = 'approved')"


def _money(value) -> Decimal:
    return Decimal(str(value)) if value is not None else Decimal("0")


class AdminRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_kpis(self, hoy: date, primer_dia_mes: date) -> dict:
        ventas_totales = self.session.execute(
            text(
                "SELECT COALESCE(SUM(p.total), 0) FROM pedidos p "
                "LEFT JOIN pagos pg ON pg.pedido_id = p.id "
                "WHERE p.estado_codigo != 'CANCELADO' AND p.deleted_at IS NULL "
                f"AND {_PAGO_CONFIRMADO}"
            )
        ).scalar()

        pedidos_hoy = self.session.execute(
            text(
                "SELECT COUNT(p.id) FROM pedidos p "
                "LEFT JOIN pagos pg ON pg.pedido_id = p.id "
                "WHERE p.estado_codigo != 'CANCELADO' AND p.deleted_at IS NULL "
                f"AND {_PAGO_CONFIRMADO} "
                "AND DATE(p.created_at) = :hoy"
            ),
            {"hoy": hoy},
        ).scalar() or 0

        pedidos_mes = self.session.execute(
            text(
                "SELECT COUNT(p.id) FROM pedidos p "
                "LEFT JOIN pagos pg ON pg.pedido_id = p.id "
                "WHERE p.estado_codigo != 'CANCELADO' AND p.deleted_at IS NULL "
                f"AND {_PAGO_CONFIRMADO} "
                "AND p.created_at >= :primer_dia"
            ),
            {"primer_dia": primer_dia_mes},
        ).scalar() or 0

        ticket_promedio = self.session.execute(
            text(
                "SELECT COALESCE(AVG(p.total), 0) FROM pedidos p "
                "LEFT JOIN pagos pg ON pg.pedido_id = p.id "
                "WHERE p.estado_codigo != 'CANCELADO' AND p.deleted_at IS NULL "
                f"AND {_PAGO_CONFIRMADO}"
            )
        ).scalar()

        total_clientes = self.session.execute(
            text(
                "SELECT COUNT(id) FROM usuarios "
                "WHERE deleted_at IS NULL "
                "AND id NOT IN ("
                "  SELECT usuario_id FROM usuario_rol "
                "  WHERE role_id IN ('ADMIN', 'STOCK', 'PEDIDOS')"
                ")"
            )
        ).scalar() or 0

        productos_activos = self.session.execute(
            text(
                "SELECT COUNT(id) FROM productos "
                "WHERE disponible = TRUE AND deleted_at IS NULL"
            )
        ).scalar() or 0

        return {
            "ventas_totales": _money(ventas_totales),
            "pedidos_hoy": int(pedidos_hoy),
            "pedidos_mes": int(pedidos_mes),
            "ticket_promedio": _money(ticket_promedio),
            "total_clientes": int(total_clientes),
            "productos_activos": int(productos_activos),
        }

    def get_estados(self) -> list:
        return self.session.execute(
            text(
                "SELECT estado_codigo, COUNT(id) "
                "FROM pedidos WHERE deleted_at IS NULL "
                "GROUP BY estado_codigo ORDER BY COUNT(id) DESC"
            )
        ).fetchall()

    def get_ventas_por_dia(self, inicio: date) -> list:
        return self.session.execute(
            text(
                "SELECT DATE(p.created_at) AS fecha, COALESCE(SUM(p.total), 0) AS total "
                "FROM pedidos p "
                "LEFT JOIN pagos pg ON pg.pedido_id = p.id "
                "WHERE p.estado_codigo != 'CANCELADO' AND p.deleted_at IS NULL "
                "  AND p.created_at >= :inicio "
                f"  AND {_PAGO_CONFIRMADO} "
                "GROUP BY DATE(p.created_at) "
                "ORDER BY DATE(p.created_at)"
            ),
            {"inicio": inicio},
        ).fetchall()

    def get_top_productos(self) -> list:
        return self.session.execute(
            text(
                "SELECT dp.nombre_snapshot, "
                "       SUM(dp.cantidad) AS total_unidades, "
                "       COALESCE(SUM(dp.subtotal_snap), 0) AS total_ventas "
                "FROM detalle_pedidos dp "
                "JOIN pedidos p ON dp.pedido_id = p.id "
                "LEFT JOIN pagos pg ON pg.pedido_id = p.id "
                "WHERE p.estado_codigo != 'CANCELADO' AND p.deleted_at IS NULL "
                f"  AND {_PAGO_CONFIRMADO} "
                "GROUP BY dp.nombre_snapshot "
                "ORDER BY total_unidades DESC "
                "LIMIT 5"
            )
        ).fetchall()

    def get_ingresos_por_forma_pago(self) -> list:
        return self.session.execute(
            text(
                "SELECT p.forma_pago_codigo, "
                "       COUNT(p.id) AS cantidad_pedidos, "
                "       COALESCE(SUM(p.total), 0) AS total_ingresos "
                "FROM pedidos p "
                "LEFT JOIN pagos pg ON pg.pedido_id = p.id "
                "WHERE p.deleted_at IS NULL AND p.estado_codigo != 'CANCELADO' "
                f"  AND {_PAGO_CONFIRMADO} "
                "GROUP BY p.forma_pago_codigo "
                "ORDER BY total_ingresos DESC"
            )
        ).fetchall()

    def get_pedidos_recientes(self) -> list:
        return self.session.execute(
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
