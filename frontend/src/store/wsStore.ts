import { create } from 'zustand';

interface NewPedidoAlert {
  id: number;
  usuario_id: number;
  total: string;
}

interface WsStore {
  /** Real-time estado overrides from WS events: pedido_id → estado_codigo */
  estadosRT: Record<number, string>;
  /** Latest NUEVO_PEDIDO event, consumed by AdminPedidosPage for the notification banner */
  newPedidoAlert: NewPedidoAlert | null;

  applyEvent: (event: string, data: Record<string, unknown>) => void;
  clearNewPedidoAlert: () => void;
}

export const useWsStore = create<WsStore>((set) => ({
  estadosRT: {},
  newPedidoAlert: null,

  applyEvent: (event, data) => {
    const id = typeof data.id === 'number' ? data.id : undefined;
    const estadoCodigo = typeof data.estado_codigo === 'string' ? data.estado_codigo : undefined;

    set((state) => {
      const next: Partial<WsStore> = {};

      if (id !== undefined && estadoCodigo) {
        next.estadosRT = { ...state.estadosRT, [id]: estadoCodigo };
      }

      if (event === 'NUEVO_PEDIDO' && id !== undefined) {
        next.newPedidoAlert = {
          id,
          usuario_id: typeof data.usuario_id === 'number' ? data.usuario_id : 0,
          total: String(data.total ?? '0'),
        };
      }

      return next;
    });
  },

  clearNewPedidoAlert: () => set({ newPedidoAlert: null }),
}));
