import { Categoria, CategoriaCreate } from '../types';
import { API_URL } from '../config';

const BASE = `${API_URL}/categorias`;

export const getCategorias = async (): Promise<Categoria[]> => {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Error al obtener categorías');
  return res.json();
};

export const getCategoriaStats = async (id: number): Promise<{ subcategorias_count: number; productos_count: number; nivel: number }> => {
  const res = await fetch(`${BASE}/${id}/stats`);
  if (!res.ok) throw new Error('Error al obtener estadísticas');
  return res.json();
};

export const createCategoria = async (data: CategoriaCreate): Promise<Categoria> => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al crear categoría');
  }
  return res.json();
};

export const updateCategoria = async (id: number, data: Partial<CategoriaCreate>): Promise<Categoria> => {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al actualizar categoría');
  }
  return res.json();
};

export const deleteCategoria = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar categoría');
};
