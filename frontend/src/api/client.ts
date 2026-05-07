import { API_URL } from '../config';
import { getAuthToken, useAuthStore } from '../store/authStore';

/** Wrapper genérico de fetch con autenticación, manejo de errores y parseo JSON. */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const { skipAuth = false, headers: incomingHeaders, body, ...restOptions } = options ?? {};

  const headers = new Headers(incomingHeaders);

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  if (body != null && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    body,
    headers,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    const { pathname } = window.location;
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
    throw new Error('No autorizado');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    let message: string;
    try {
      const data = await response.json() as { detail?: string };
      message = data.detail ?? `${response.status} ${response.statusText}`;
    } catch {
      message = `${response.status} ${response.statusText}`;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

/** Construye un query string omitiendo valores vacíos, nulos o undefined. */
export function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (entries.length === 0) return '';
  const qs = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return `?${qs}`;
}
