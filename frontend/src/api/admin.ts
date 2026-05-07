import { apiFetch } from './client';

export interface CategoriaKPI {
  id: number;
  nombre: string;
  total_productos: number;
}

export interface DashboardData {
  total_productos: number;
  productos_stock_bajo: number;
  productos_sin_stock: number;
  valor_total_inventario: number;
  top_categorias: CategoriaKPI[];
}

export const getDashboard = async (): Promise<DashboardData> =>
  apiFetch<DashboardData>('/admin/dashboard');
