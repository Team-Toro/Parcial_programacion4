import type { Pedido, PedidoCreate, CambioEstadoRequest, HistorialEstadoPedido } from '../types';
import { apiFetch, buildQueryString } from './client';

export const createPedido = (data: PedidoCreate): Promise<Pedido> =>
  apiFetch<Pedido>('/api/v1/pedidos/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getMisPedidos = (offset = 0, limit = 20, soloActivos?: boolean): Promise<Pedido[]> =>
  apiFetch<Pedido[]>(`/api/v1/pedidos/mis-pedidos${buildQueryString({ offset, limit, ...(soloActivos !== undefined && { solo_activos: soloActivos }) })}`);

export const getAllPedidos = (params?: {
  usuario_id?: number;
  estado_codigo?: string;
  offset?: number;
  limit?: number;
}): Promise<Pedido[]> =>
  apiFetch<Pedido[]>(`/api/v1/pedidos/${buildQueryString(params ?? {})}`);

export const getPedido = (id: number): Promise<Pedido> =>
  apiFetch<Pedido>(`/api/v1/pedidos/${id}`);

export const avanzarEstadoPedido = (id: number, data: CambioEstadoRequest): Promise<Pedido> =>
  apiFetch<Pedido>(`/api/v1/pedidos/${id}/avanzar`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const cancelarPedido = (id: number, motivo: string): Promise<Pedido> =>
  apiFetch<Pedido>(`/api/v1/pedidos/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });

export const getHistorialPedido = (id: number): Promise<HistorialEstadoPedido[]> =>
  apiFetch<HistorialEstadoPedido[]>(`/api/v1/pedidos/${id}/historial`);
