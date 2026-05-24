import type { FormaPago } from '../types';
import { apiFetch } from './client';

export const getFormasPago = (): Promise<FormaPago[]> =>
  apiFetch<FormaPago[]>('/api/v1/formas-pago/');
