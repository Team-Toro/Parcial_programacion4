import { api, apiFetch } from './client';
import type { LoginCredentials, LoginResponse, RegisterPayload, Usuario } from '../types';

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  // OAuth2PasswordRequestForm espera application/x-www-form-urlencoded, no JSON.
  // Se llama api.post directamente para override el Content-Type de la instancia.
  const params = new URLSearchParams();
  params.append('username', credentials.username);
  params.append('password', credentials.password);
  const response = await api.post<LoginResponse>('/api/v1/auth/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
}

export const register = (payload: RegisterPayload): Promise<Usuario> =>
  apiFetch<Usuario>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const getMe = (): Promise<Usuario> =>
  apiFetch<Usuario>('/api/v1/auth/me');

export async function refreshAccessToken(): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/api/v1/auth/refresh');
  return response.data;
}

export async function logoutBackend(): Promise<void> {
  await api.post('/api/v1/auth/logout').catch(() => {});
}
