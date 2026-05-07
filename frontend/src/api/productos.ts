import type { Producto, ProductoCreate, ProductoListParams, PaginatedResponse } from '../types';
import { apiFetch, buildQueryString } from './client';

export const getProductos = async (params?: ProductoListParams): Promise<PaginatedResponse<Producto>> => {
  const { offset, limit, q, categoria_id, precio_min, precio_max, in_stock, disponible, sort, order } = params ?? {};
  return apiFetch<PaginatedResponse<Producto>>(`/productos${buildQueryString({ offset, limit, q, categoria_id, precio_min, precio_max, in_stock, disponible, sort, order })}`);
};

export const getProductoById = async (id: number): Promise<Producto> =>
  apiFetch<Producto>(`/productos/${id}`);

export const createProducto = async (data: ProductoCreate): Promise<Producto> =>
  apiFetch<Producto>('/productos', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateProducto = async (id: number, data: Partial<ProductoCreate>): Promise<Producto> =>
  apiFetch<Producto>(`/productos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteProducto = async (id: number): Promise<void> =>
  apiFetch<void>(`/productos/${id}`, { method: 'DELETE' });

export const reactivateProducto = async (id: number): Promise<Producto> =>
  apiFetch<Producto>(`/productos/${id}/reactivar`, { method: 'POST' });
