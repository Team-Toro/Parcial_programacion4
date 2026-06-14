import { create } from 'zustand';

type PaymentStatus = 'idle' | 'creating_preference' | 'redirecting' | 'verifying' | 'approved' | 'rejected' | 'failed';

interface PaymentState {
  status: PaymentStatus;
  currentPedidoId: number | null;
  preferenceId: string | null;
  initPoint: string | null;
  errorMessage: string | null;

  setStatus: (status: PaymentStatus) => void;
  setPedidoActivo: (pedido_id: number, preference_id: string, init_point: string) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  status: 'idle',
  currentPedidoId: null,
  preferenceId: null,
  initPoint: null,
  errorMessage: null,

  setStatus: (status) => set({ status }),
  setPedidoActivo: (pedido_id, preference_id, init_point) =>
    set({
      status: 'redirecting',
      currentPedidoId: pedido_id,
      preferenceId: preference_id,
      initPoint: init_point,
    }),
  setError: (msg) => set({ status: 'failed', errorMessage: msg }),
  reset: () =>
    set({
      status: 'idle',
      currentPedidoId: null,
      preferenceId: null,
      initPoint: null,
      errorMessage: null,
    }),
}));
