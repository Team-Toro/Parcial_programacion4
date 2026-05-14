import { API_URL } from '../config';
import { getAuthToken, useAuthStore } from '../store/authStore';
import type { LoginResponse } from '../types';

// ─── Refresh Token Interceptor ────────────────────────────────────────────────
// Estas variables son de módulo (compartidas por todas las llamadas concurrentes)
// para garantizar que solo se haga UN refresh aunque lleguen múltiples 401 juntos.

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string): void {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

function clearQueueAndLogout(): void {
  refreshQueue = [];
  useAuthStore.getState().logout();
  const { pathname } = window.location;
  if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    window.location.href = '/login';
  }
}

async function doRefresh(refreshToken: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json() as LoginResponse;
  useAuthStore.getState().login(data.access_token, data.refresh_token, useAuthStore.getState().user!);
  return data.access_token;
}

// ─── apiFetch ─────────────────────────────────────────────────────────────────

/**
 * Wrapper de fetch con autenticación Bearer, interceptor de 401 con refresh token,
 * y normalización de errores de FastAPI al formato `Error.message`.
 * @param path ruta relativa al API_URL (ej. `/categorias`)
 * @param options opciones de RequestInit más `skipAuth` para omitir el header de auth
 * @returns respuesta tipada como `T`
 */
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

  // Solo agrega Content-Type JSON si hay body y no es un tipo que ya trae su propio Content-Type
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
    // Endpoints de auth nunca pasan por el flujo de refresh — propagan el error original
    const isAuthEndpoint =
      path.includes('/auth/token') ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/logout');

    if (isAuthEndpoint) {
      let message: string;
      try {
        const data = await response.json() as { detail?: string };
        message = data.detail ?? `${response.status} ${response.statusText}`;
      } catch {
        message = `${response.status} ${response.statusText}`;
      }
      throw new Error(message);
    }

    const { refreshToken } = useAuthStore.getState();

    if (!refreshToken) {
      // Sin sesión activa — limpiar store sin redirigir si ya estamos en login/register
      clearQueueAndLogout();
      throw new Error('No autorizado');
    }

    // Si ya hay un refresh en vuelo, encolar este request hasta que termine
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push((newToken: string) => {
          const retryHeaders = new Headers(incomingHeaders);
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
          if (body != null && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
            if (!retryHeaders.has('Content-Type')) retryHeaders.set('Content-Type', 'application/json');
          }
          fetch(`${API_URL}${path}`, { ...restOptions, body, headers: retryHeaders })
            .then((r) => r.ok ? r.json() as Promise<T> : Promise.reject(new Error(`${r.status}`)))
            .then(resolve)
            .catch(reject);
        });
      });
    }

    isRefreshing = true;
    try {
      const newToken = await doRefresh(refreshToken);
      isRefreshing = false;
      processQueue(newToken);

      // Reintentar el request original con el token nuevo
      const retryHeaders = new Headers(incomingHeaders);
      retryHeaders.set('Authorization', `Bearer ${newToken}`);
      if (body != null && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
        if (!retryHeaders.has('Content-Type')) retryHeaders.set('Content-Type', 'application/json');
      }
      const retryResponse = await fetch(`${API_URL}${path}`, { ...restOptions, body, headers: retryHeaders });
      if (retryResponse.status === 204) return undefined as T;
      if (!retryResponse.ok) {
        const data = await retryResponse.json().catch(() => ({})) as { detail?: string };
        throw new Error(data.detail ?? `${retryResponse.status}`);
      }
      return retryResponse.json() as Promise<T>;
    } catch {
      isRefreshing = false;
      clearQueueAndLogout();
      throw new Error('No autorizado');
    }
  }

  // 204 No Content — el back no manda body
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

/**
 * Arma un query string desde un objeto, omitiendo entradas con valor `undefined`, `null` o `''`.
 * @param params objeto clave-valor con los parámetros
 * @returns string con formato `?key=value&...`, o `''` si no hay parámetros válidos
 */
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
