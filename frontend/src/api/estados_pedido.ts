import type { EstadoPedido } from '../types';
import { apiFetch } from './client';

export const getEstadosPedido = (): Promise<EstadoPedido[]> =>
  apiFetch<EstadoPedido[]>('/estados-pedido/');
