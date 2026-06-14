import { api } from './client';

export interface EstadoCount {
  estado: string;
  cantidad: number;
}

// Los montos llegan como string (el backend serializa Decimal → string para
// preservar precisión). Castear con Number() antes de formatear/graficar.
export interface VentasPorDia {
  fecha: string;
  total: string;
}

export interface TopProducto {
  nombre: string;
  total_unidades: number;
  total_ventas: string;
}

export interface IngresoPorFormaPago {
  forma_pago_codigo: string;
  cantidad_pedidos: number;
  total_ingresos: string;
}

export interface PedidoReciente {
  id: number;
  cliente: string;
  email: string;
  estado: string;
  total: string;
  created_at: string;
}

export interface DashboardStats {
  ventas_totales: string;
  pedidos_hoy: number;
  pedidos_mes: number;
  ticket_promedio: string;
  total_clientes: number;
  productos_activos: number;
  estados: EstadoCount[];
  ventas_por_dia: VentasPorDia[];
  top_productos: TopProducto[];
  ingresos_por_forma_pago: IngresoPorFormaPago[];
  pedidos_recientes: PedidoReciente[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/api/v1/admin/stats');
  return data;
}
