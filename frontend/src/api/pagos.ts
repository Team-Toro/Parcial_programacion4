import { apiFetch } from './client';
import type { Pago } from '../types';

export interface WebhookMockPayload {
  external_reference: string;
  mp_status: 'approved' | 'rejected' | 'cancelled';
  mp_payment_id?: number;
  payment_method_id?: string;
}

export const simularWebhookMP = (data: WebhookMockPayload): Promise<Pago> =>
  apiFetch<Pago>('/pagos/webhook', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getPagoByPedido = (pedido_id: number): Promise<Pago> =>
  apiFetch<Pago>(`/pagos/pedido/${pedido_id}`);
