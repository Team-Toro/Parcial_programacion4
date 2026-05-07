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
