import type { Categoria, CategoriaCreate, CategoriaStats } from '../types';
import { apiFetch, buildQueryString } from './client';

export const getCategorias = async (params?: { offset?: number; limit?: number; q?: string; parent_id?: number; only_roots?: boolean; sort?: string; order?: string }): Promise<Categoria[]> => {
  const { offset, limit, q, parent_id, only_roots, sort, order } = params ?? {};
  return apiFetch<Categoria[]>(`/categorias${buildQueryString({ offset, limit, q, parent_id, only_roots, sort, order })}`);
};

export const getCategoriaStats = async (id: number): Promise<CategoriaStats> =>
  apiFetch<CategoriaStats>(`/categorias/${id}/stats`);

export const createCategoria = async (data: CategoriaCreate): Promise<Categoria> =>
  apiFetch<Categoria>('/categorias', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateCategoria = async (id: number, data: Partial<CategoriaCreate>): Promise<Categoria> =>
  apiFetch<Categoria>(`/categorias/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteCategoria = async (id: number): Promise<void> =>
  apiFetch<void>(`/categorias/${id}`, { method: 'DELETE' });
