import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config';
import { useAuthStore } from '../store/authStore';

// Permite que el interceptor marque requests que ya fueron reintentadas
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// ─── Instancia de Axios ───────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // envía cookies HttpOnly automáticamente en cada request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Interceptor de response — 401 + refresh de cookies ──────────────────────

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: Error | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  refreshQueue = [];
}

function clearQueueAndLogout(): void {
  processQueue(new Error('No autorizado'));
  useAuthStore.getState().logout();
  const { pathname } = window.location;
  if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    window.location.href = '/login';
  }
}

function normalizeAxiosError(error: unknown): Error {
  const axErr = error as AxiosError<{ detail?: unknown }>;
  const detail = axErr.response?.data?.detail;
  if (detail !== undefined) {
    return new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (axErr.response?.status) {
    return new Error(`${axErr.response.status} ${axErr.response.statusText ?? ''}`.trim());
  }
  if (error instanceof Error) return error;
  return new Error('Network error');
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig;
    const status = error.response?.status;
    const isAuthEndpoint =
      config?.url?.includes('/auth/refresh') ||
      config?.url?.includes('/auth/token') ||
      config?.url?.includes('/auth/logout');

    if (status === 401 && !config?._retry && !isAuthEndpoint) {
      // Refresh ya en curso → encolar y esperar
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => api(config));
      }

      config._retry = true;
      isRefreshing = true;

      try {
        // El servidor rota los tokens y setea las nuevas cookies
        await api.post('/api/v1/auth/refresh');
        isRefreshing = false;
        processQueue(null);
        return api(config); // reintentar el request original
      } catch (refreshError) {
        isRefreshing = false;
        const normErr = normalizeAxiosError(refreshError);
        processQueue(normErr);
        useAuthStore.getState().logout();
        
        // Si el request original era /auth/me, es un invitado sin sesión.
        // No forzamos la redirección hard al login para dejarlo navegar en rutas públicas.
        const isAuthMe = config?.url?.includes('/auth/me');
        if (!isAuthMe) {
          clearQueueAndLogout();
        }
        
        return Promise.reject(normErr);
      }
    }

    return Promise.reject(normalizeAxiosError(error));
  }
);

// ─── apiFetch — wrapper de compatibilidad sobre axios ────────────────────────
//
// Mantiene la misma firma que el apiFetch de fetch nativo, así todos los
// archivos api/*.ts funcionan sin cambios. Option A del enunciado.

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const { skipAuth: _skipAuth, headers: incomingHeaders, body, method } = options ?? {};

  // Traducir body de BodyInit a algo que axios entienda
  let data: unknown = undefined;

  if (body instanceof URLSearchParams) {
    // OAuth2 form-encoded (login). Axios detecta URLSearchParams y setea
    // Content-Type: application/x-www-form-urlencoded automáticamente.
    data = body;
  } else if (body instanceof FormData) {
    // FormData: el browser setea Content-Type con boundary.
    data = body;
  } else if (typeof body === 'string' && body.length > 0) {
    // JSON.stringify → parsear de vuelta; axios re-serializa con Content-Type: application/json
    try {
      data = JSON.parse(body);
    } catch {
      data = body;
    }
  }

  // Copiar headers adicionales que el caller haya pasado
  const extraHeaders: Record<string, string> = {};
  if (incomingHeaders) {
    new Headers(incomingHeaders as HeadersInit).forEach((v, k) => {
      extraHeaders[k] = v;
    });
  }

  const response = await api.request<T>({
    url: path,
    method: (method || 'GET') as string,
    data,
    headers: Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
  });

  // 204 No Content: el back no manda body
  if (response.status === 204) return undefined as T;
  return response.data;
}

// ─── buildQueryString ─────────────────────────────────────────────────────────

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
