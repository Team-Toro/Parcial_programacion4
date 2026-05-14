import { API_URL } from '../config';
import { apiFetch } from './client';
import type { LoginCredentials, LoginResponse, RegisterPayload, Usuario } from '../types';

export const login = (credentials: LoginCredentials): Promise<LoginResponse> =>
  apiFetch<LoginResponse>('/api/v1/auth/token', {
    method: 'POST',
    body: new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
    }),
    skipAuth: true,
  });

export const register = (payload: RegisterPayload): Promise<Usuario> =>
  apiFetch<Usuario>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const getMe = (): Promise<Usuario> =>
  apiFetch<Usuario>('/api/v1/auth/me');

export async function refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  return res.json() as Promise<LoginResponse>;
}

export async function logoutBackend(refreshToken: string): Promise<void> {
  await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {});
}
