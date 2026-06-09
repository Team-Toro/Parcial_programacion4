import { apiFetch } from './client';
import type { Pago } from '../types';

export interface WebhookMockPayload {
  external_reference: string;
  mp_status: 'approved' | 'rejected' | 'cancelled';
  mp_payment_id?: number;
  payment_method_id?: string;
}

export interface PagoCrearResponse {
  pago_id: number;
  preference_id: string;
  init_point: string;
  public_key: string | null;
}

export interface PagoEstadoResponse {
  estado: string;
  pedido_id: number;
}

export const simularWebhookMP = (data: WebhookMockPayload): Promise<Pago> =>
  apiFetch<Pago>('/api/v1/pagos/webhook', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getPagoByPedido = (pedido_id: number): Promise<Pago> =>
  apiFetch<Pago>(`/api/v1/pagos/pedido/${pedido_id}`);

export const crearPreferencia = (pedido_id: number): Promise<PagoCrearResponse> =>
  apiFetch<PagoCrearResponse>('/api/v1/pagos/create-preference', {
    method: 'POST',
    body: JSON.stringify({ pedido_id }),
  });

export const confirmarPago = (
  pedido_id: number,
  payment_id: number | null = null
): Promise<PagoEstadoResponse> =>
  apiFetch<PagoEstadoResponse>('/api/v1/pagos/confirm', {
    method: 'POST',
    body: JSON.stringify({ pedido_id, payment_id }),
  });
