import type { Usuario } from '../types';
import { apiFetch, buildQueryString } from './client';

export interface UsuarioListParams {
  offset?: number;
  limit?: number;
  q?: string;
  role?: string;
  disabled?: boolean;
  sort?: 'id' | 'first_name' | 'last_name' | 'email';
  order?: 'asc' | 'desc';
}

export const getUsuariosAdmin = async (params?: UsuarioListParams): Promise<Usuario[]> => {
  const { offset, limit, q, role, disabled, sort, order } = params ?? {};
  return apiFetch<Usuario[]>(
    `/api/v1/auth/admin/usuarios${buildQueryString({ offset, limit, q, role, disabled, sort, order })}`
  );
};

export const deactivateUsuario = (id: number): Promise<Usuario> =>
  apiFetch<Usuario>(`/api/v1/auth/admin/usuarios/${id}/desactivar`, { method: 'POST' });

export const activateUsuario = (id: number): Promise<Usuario> =>
  apiFetch<Usuario>(`/api/v1/auth/admin/usuarios/${id}/activar`, { method: 'POST' });

export const updateUsuarioRoles = (id: number, roles: string[]): Promise<Usuario> =>
  apiFetch<Usuario>(`/api/v1/auth/admin/usuarios/${id}/roles`, {
    method: 'PUT',
    body: JSON.stringify({ roles }),
  });
