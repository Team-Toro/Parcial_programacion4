import type { Categoria, CategoriaCreate, CategoriaListParams } from '../types';
import { apiFetch, buildQueryString } from './client';

export const getCategorias = async (params?: CategoriaListParams): Promise<Categoria[]> => {
  const { offset, limit, q, parent_id, only_roots, sort, order, include_deleted } = params ?? {};
  return apiFetch<Categoria[]>(
    `/api/v1/categorias/${buildQueryString({ offset, limit, q, parent_id, only_roots, sort, order, include_deleted })}`
  );
};

export const getCategoriaStats = async (id: number): Promise<{ subcategorias_count: number; productos_count: number; nivel: number }> =>
  apiFetch(`/api/v1/categorias/${id}/stats`);

export const createCategoria = async (data: CategoriaCreate): Promise<Categoria> =>
  apiFetch<Categoria>('/api/v1/categorias/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateCategoria = async (id: number, data: Partial<CategoriaCreate>): Promise<Categoria> =>
  apiFetch<Categoria>(`/api/v1/categorias/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteCategoria = async (id: number): Promise<void> =>
  apiFetch<void>(`/api/v1/categorias/${id}`, { method: 'DELETE' });

export const reactivarCategoria = async (id: number): Promise<Categoria> =>
  apiFetch<Categoria>(`/api/v1/categorias/${id}/reactivar`, { method: 'POST' });

export const actualizarImagenCategoria = (id: number, imagen_url: string | null): Promise<Categoria> =>
  apiFetch<Categoria>(`/api/v1/categorias/${id}/imagen`, {
    method: 'PATCH',
    body: JSON.stringify({ imagen_url }),
  });
