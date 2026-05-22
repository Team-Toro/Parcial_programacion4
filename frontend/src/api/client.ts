import { API_URL } from '../config';
import { useAuthStore } from '../store/authStore';

// ─── Refresh Token Interceptor ────────────────────────────────────────────────
// Solo se hace UN refresh aunque lleguen múltiples 401 concurrentes.

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

function processQueue(): void {
  refreshQueue.forEach((cb) => cb());
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

async function doRefresh(): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Refresh failed');
  // El servidor setea las nuevas cookies — no hay nada que leer del body
}

// ─── apiFetch ─────────────────────────────────────────────────────────────────

/**
 * Wrapper de fetch con cookies HttpOnly, interceptor de 401 con refresh automático,
 * y normalización de errores de FastAPI al formato `Error.message`.
 * El navegador envía las cookies automáticamente con credentials: 'include'.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const { skipAuth: _skipAuth, headers: incomingHeaders, body, ...restOptions } = options ?? {};

  const headers = new Headers(incomingHeaders);

  // Solo agrega Content-Type JSON si hay body y no es un tipo que ya trae el suyo
  if (body != null && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...restOptions,
    body,
    headers,
    credentials: 'include',
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

    // Sin usuario en store → no hay sesión activa, limpiar y redirigir
    const { user } = useAuthStore.getState();
    if (!user) {
      clearQueueAndLogout();
      throw new Error('No autorizado');
    }

    // Si ya hay un refresh en vuelo, encolar este request hasta que termine
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push(() => {
          const retryHeaders = new Headers(incomingHeaders);
          if (body != null && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
            if (!retryHeaders.has('Content-Type')) retryHeaders.set('Content-Type', 'application/json');
          }
          fetch(`${API_URL}${path}`, { ...restOptions, body, headers: retryHeaders, credentials: 'include' })
            .then((r) => r.ok ? r.json() as Promise<T> : Promise.reject(new Error(`${r.status}`)))
            .then(resolve)
            .catch(reject);
        });
      });
    }

    isRefreshing = true;
    try {
      await doRefresh();
      isRefreshing = false;
      processQueue();

      // Reintentar el request original — el browser ya tiene las nuevas cookies
      const retryHeaders = new Headers(incomingHeaders);
      if (body != null && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
        if (!retryHeaders.has('Content-Type')) retryHeaders.set('Content-Type', 'application/json');
      }
      const retryResponse = await fetch(`${API_URL}${path}`, { ...restOptions, body, headers: retryHeaders, credentials: 'include' });
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
