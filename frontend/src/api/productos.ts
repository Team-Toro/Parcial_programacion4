import type { Producto, ProductoCreate, ProductoListParams } from '../types';
import { apiFetch, buildQueryString } from './client';

export const getProductos = async (params?: ProductoListParams): Promise<Producto[]> => {
  const { offset, limit, q, disponible, categoria_id, precio_min, precio_max,
    stock_min, stock_max, in_stock, sort, order, include_deleted } = params ?? {};
  return apiFetch<Producto[]>(
    `/api/v1/productos/${buildQueryString({ offset, limit, q, disponible, categoria_id,
      precio_min, precio_max, stock_min, stock_max, in_stock, sort, order, include_deleted })}`
  );
};

export const getProductoById = async (id: number): Promise<Producto> =>
  apiFetch<Producto>(`/api/v1/productos/${id}`);

export const createProducto = async (data: ProductoCreate): Promise<Producto> =>
  apiFetch<Producto>('/api/v1/productos/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateProducto = async (id: number, data: Partial<ProductoCreate>): Promise<Producto> =>
  apiFetch<Producto>(`/api/v1/productos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteProducto = async (id: number): Promise<void> =>
  apiFetch<void>(`/api/v1/productos/${id}`, { method: 'DELETE' });

export const reactivarProducto = async (id: number): Promise<Producto> =>
  apiFetch<Producto>(`/api/v1/productos/${id}/reactivar`, { method: 'POST' });

export const actualizarImagenesProducto = (id: number, imagenes_url: string[]): Promise<Producto> =>
  apiFetch<Producto>(`/api/v1/productos/${id}/imagenes`, {
    method: 'PATCH',
    body: JSON.stringify({ imagenes_url }),
  });
