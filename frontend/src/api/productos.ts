import { Producto, ProductoCreate } from '../types';
import { API_URL } from '../config';

const BASE = `${API_URL}/productos`;

export const getProductos = async (): Promise<Producto[]> => {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Error al obtener productos');
  return res.json();
};

export const getProductoById = async (id: number): Promise<Producto> => {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('Producto no encontrado');
  return res.json();
};

export const createProducto = async (data: ProductoCreate): Promise<Producto> => {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al crear producto');
  }
  return res.json();
};

export const updateProducto = async (id: number, data: Partial<ProductoCreate>): Promise<Producto> => {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Error al actualizar producto');
  }
  return res.json();
};

export const deleteProducto = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar producto');
};
