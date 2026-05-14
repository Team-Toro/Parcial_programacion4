import type { Direccion, DireccionCreate, DireccionUpdate } from '../types';
import { apiFetch } from './client';

export const getDirecciones = async (): Promise<Direccion[]> =>
  apiFetch<Direccion[]>('/direcciones');

export const getDireccion = async (id: number): Promise<Direccion> =>
  apiFetch<Direccion>(`/direcciones/${id}`);

export const createDireccion = async (data: DireccionCreate): Promise<Direccion> =>
  apiFetch<Direccion>('/direcciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateDireccion = async (id: number, data: DireccionUpdate): Promise<Direccion> =>
  apiFetch<Direccion>(`/direcciones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteDireccion = async (id: number): Promise<void> =>
  apiFetch<void>(`/direcciones/${id}`, { method: 'DELETE' });

export const marcarDireccionPrincipal = async (id: number): Promise<Direccion> =>
  apiFetch<Direccion>(`/direcciones/${id}/marcar-principal`, { method: 'POST' });
