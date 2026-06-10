import { api } from './client';

export interface EstadoCount {
  estado: string;
  cantidad: number;
}

export interface VentasPorDia {
  fecha: string;
  total: number;
}

export interface TopProducto {
  nombre: string;
  total_unidades: number;
  total_ventas: number;
}

export interface PedidoReciente {
  id: number;
  cliente: string;
  email: string;
  estado: string;
  total: number;
  created_at: string;
}

export interface DashboardStats {
  ventas_totales: number;
  pedidos_hoy: number;
  pedidos_mes: number;
  ticket_promedio: number;
  total_clientes: number;
  productos_activos: number;
  estados: EstadoCount[];
  ventas_por_dia: VentasPorDia[];
  top_productos: TopProducto[];
  pedidos_recientes: PedidoReciente[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/api/v1/admin/stats');
  return data;
}
