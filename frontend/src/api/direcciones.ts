import type { Direccion, DireccionCreate, DireccionUpdate } from '../types';
import { apiFetch } from './client';

export const getDirecciones = async (): Promise<Direccion[]> =>
  apiFetch<Direccion[]>('/api/v1/direcciones/');

export const getDireccion = async (id: number): Promise<Direccion> =>
  apiFetch<Direccion>(`/api/v1/direcciones/${id}`);

export const createDireccion = async (data: DireccionCreate): Promise<Direccion> =>
  apiFetch<Direccion>('/api/v1/direcciones/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateDireccion = async (id: number, data: DireccionUpdate): Promise<Direccion> =>
  apiFetch<Direccion>(`/api/v1/direcciones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteDireccion = async (id: number): Promise<void> =>
  apiFetch<void>(`/api/v1/direcciones/${id}`, { method: 'DELETE' });

export const marcarDireccionPrincipal = async (id: number): Promise<Direccion> =>
  apiFetch<Direccion>(`/api/v1/direcciones/${id}/marcar-principal`, { method: 'POST' });

export const marcarDireccionPrincipalPatch = async (id: number): Promise<Direccion> =>
  apiFetch<Direccion>(`/api/v1/direcciones/${id}/principal`, { method: 'PATCH' });
