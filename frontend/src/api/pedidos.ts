import type { Pedido, PedidoCreate } from '../types';
import { apiFetch, buildQueryString } from './client';

export const createPedido = (data: PedidoCreate): Promise<Pedido> =>
  apiFetch<Pedido>('/pedidos/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getMisPedidos = (offset = 0, limit = 20): Promise<Pedido[]> =>
  apiFetch<Pedido[]>(`/pedidos/mis-pedidos${buildQueryString({ offset, limit })}`);

export const getAllPedidos = (params?: {
  usuario_id?: number;
  estado_codigo?: string;
  offset?: number;
  limit?: number;
}): Promise<Pedido[]> =>
  apiFetch<Pedido[]>(`/pedidos/${buildQueryString(params ?? {})}`);

export const getPedido = (id: number): Promise<Pedido> =>
  apiFetch<Pedido>(`/pedidos/${id}`);
