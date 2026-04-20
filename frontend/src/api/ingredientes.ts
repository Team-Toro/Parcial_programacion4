import { Ingrediente, IngredienteCreate } from '../types';
import { API_URL } from '../config';

const BASE = `${API_URL}/ingredientes`;

export const getIngredientes = async (): Promise<Ingrediente[]> => {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Error al obtener ingredientes');
  return res.json();
};

export const createIngrediente = async (data: IngredienteCreate): Promise<Ingrediente> => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al crear ingrediente');
  }
  return res.json();
};

export const updateIngrediente = async (id: number, data: Partial<IngredienteCreate>): Promise<Ingrediente> => {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al actualizar ingrediente');
  }
  return res.json();
};

export const deleteIngrediente = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar ingrediente');
};
