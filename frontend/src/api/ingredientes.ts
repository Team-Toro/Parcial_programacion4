import type { Ingrediente, IngredienteCreate, IngredienteListParams } from '../types';
import { apiFetch, buildQueryString } from './client';

export const getIngredientes = async (params?: IngredienteListParams): Promise<Ingrediente[]> => {
  const { offset, limit, q, es_alergeno, sort, order, include_deleted } = params ?? {};
  return apiFetch<Ingrediente[]>(
    `/ingredientes${buildQueryString({ offset, limit, q, es_alergeno, sort, order, include_deleted })}`
  );
};

export const createIngrediente = async (data: IngredienteCreate): Promise<Ingrediente> =>
  apiFetch<Ingrediente>('/ingredientes', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateIngrediente = async (id: number, data: Partial<IngredienteCreate>): Promise<Ingrediente> =>
  apiFetch<Ingrediente>(`/ingredientes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteIngrediente = async (id: number): Promise<void> =>
  apiFetch<void>(`/ingredientes/${id}`, { method: 'DELETE' });

export const reactivarIngrediente = async (id: number): Promise<Ingrediente> =>
  apiFetch<Ingrediente>(`/ingredientes/${id}/reactivar`, { method: 'POST' });
