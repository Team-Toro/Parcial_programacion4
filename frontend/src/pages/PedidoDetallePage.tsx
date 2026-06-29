import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPedido, cancelarPedido } from '../api/pedidos';
import { getPagoByPedido, crearPreferencia } from '../api/pagos';
import TimelinePedido from '../components/pedidos/TimelinePedido';
import ModalMotivo from '../components/pedidos/ModalMotivo';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWsStore } from '../store/wsStore';

const PAGO_STATUS_COLORS: Record<string, string> = {
  approved:   'bg-green-100 text-green-700',
  pending:    'bg-amber-100 text-amber-700',
  rejected:   'bg-red-100 text-red-700',
  cancelled:  'bg-slate-100 text-slate-600',
  in_process: 'bg-blue-100 text-blue-700',
};

const PAGO_STATUS_LABELS: Record<string, string> = {
  approved:   'Pago aprobado',
  pending:    'Esperando pago',
  rejected:   'Pago rechazado',
  cancelled:  'Pago cancelado',
  in_process: 'Pago en proceso',
};

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  EN_PREP: 'bg-purple-100 text-purple-700',
  EN_CAMINO: 'bg-indigo-100 text-indigo-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PedidoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const pedidoId = Number(id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalCancelar, setModalCancelar] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const { subscribeToOrder, unsubscribeFromOrder } = useWebSocket();
  const estadosRT = useWsStore((s) => s.estadosRT);

  const { data: pedido, isLoading, isError } = useQuery({
    queryKey: ['pedido', pedidoId],
    queryFn: () => getPedido(pedidoId),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    subscribeToOrder(pedidoId);
    return () => { unsubscribeFromOrder(pedidoId); };
  }, [pedidoId, subscribeToOrder, unsubscribeFromOrder, id]);

  // Refetch full pedido (historial, etc.) when WS reports a state change
  const estadoRT = estadosRT[pedidoId];
  useEffect(() => {
    if (estadoRT) {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
    }
  }, [estadoRT, pedidoId, queryClient]);

  const { data: pago } = useQuery({
    queryKey: ['pago-pedido', Number(id)],
    queryFn: () => getPagoByPedido(Number(id)),
    enabled: !!id && pedido?.forma_pago_codigo === 'MERCADOPAGO',
    retry: false,
  });

  const mutCancelar = useMutation({
    mutationFn: (motivo: string) => cancelarPedido(Number(id), motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', Number(id)] });
      queryClient.invalidateQueries({ queryKey: ['mis-pedidos'] });
      setModalCancelar(false);
    },
  });

  if (isLoading || !pedido) return <div className="p-8 text-slate-500">Cargando pedido...</div>;
  if (isError) return <div className="p-8 text-red-500">Pedido no encontrado.</div>;

  const estadoEfectivo = estadosRT[pedidoId] ?? pedido.estado_codigo;
  const estadoColor = ESTADO_COLORS[estadoEfectivo] ?? 'bg-slate-100 text-slate-700';

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-3xl mx-auto">
      <Link to="/mis-pedidos" className="text-orange-500 hover:underline text-sm inline-block mb-4">
        &larr; Mis pedidos
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pedido #{pedido.id}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${estadoColor}`}>
          {estadoEfectivo}
        </span>
      </div>

      {/* Info general */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold text-slate-700 mb-3">Información del pedido</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Fecha:</span>
            <p className="font-medium text-slate-800">{formatFecha(pedido.created_at)}</p>
          </div>
          <div>
            <span className="text-slate-500">Forma de pago:</span>
            <p className="font-medium text-slate-800">{pedido.forma_pago_codigo}</p>
          </div>
          {pedido.direccion_id && (
            <div>
              <span className="text-slate-500">Dirección ID:</span>
              <p className="font-medium text-slate-800">{pedido.direccion_id}</p>
            </div>
          )}
          {pedido.notas && (
            <div className="col-span-2">
              <span className="text-slate-500">Notas:</span>
              <p className="font-medium text-slate-800">{pedido.notas}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detalles */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-5">
        <h2 className="font-semibold text-slate-700 px-5 py-4 border-b border-slate-100">
          Productos
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-2.5 text-slate-600 font-medium">Producto</th>
              <th className="text-center px-4 py-2.5 text-slate-600 font-medium">Cant.</th>
              <th className="text-right px-4 py-2.5 text-slate-600 font-medium">Precio</th>
              <th className="text-right px-5 py-2.5 text-slate-600 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(pedido.detalles ?? []).map((d) => (
              <tr key={d.producto_id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-800">{d.nombre_snapshot}</p>
                  {Array.isArray(d.personalizacion) && d.personalizacion.length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sin ingredientes: {(() => {
                        const snap: { id: number; nombre: string }[] | null | undefined =
                          (d as any).personalizacion_snapshot;
                        if (Array.isArray(snap) && snap.length > 0) {
                          return snap.map((s) => s.nombre).join(', ');
                        }
                        return (d.personalizacion as number[]).map(String).join(', ');
                      })()}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{d.cantidad}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  ${Number(d.precio_snapshot).toFixed(2)}
                </td>
                <td className="px-5 py-3 text-right font-medium text-slate-800">
                  ${Number(d.subtotal_snap).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumen monetario */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold text-slate-700 mb-3">Resumen</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>${Number(pedido.subtotal).toFixed(2)}</span>
          </div>
          {Number(pedido.descuento) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Descuento</span>
              <span>-${Number(pedido.descuento).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Costo de envío</span>
            <span>
              {Number(pedido.costo_envio) === 0
                ? 'Gratis'
                : `$${Number(pedido.costo_envio).toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between font-bold text-slate-800 text-base pt-2 border-t border-slate-100">
            <span>Total</span>
            <span>${Number(pedido.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Estado del pago (solo para MERCADOPAGO) */}
      {pago && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
          <h2 className="font-semibold text-slate-700 mb-3">Estado del pago</h2>
          <div className="flex items-center justify-between">
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                PAGO_STATUS_COLORS[pago.mp_status] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {PAGO_STATUS_LABELS[pago.mp_status] ?? pago.mp_status}
            </span>
            <span className="text-slate-500 text-sm">
              ${Number(pago.transaction_amount).toFixed(2)}
            </span>
          </div>
          {(pago.mp_status === 'pending' || pago.mp_status === 'rejected') &&
            pedido.estado_codigo === 'PENDIENTE' && (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  disabled={retryLoading}
                  onClick={async () => {
                    setRetryError(null);
                    setRetryLoading(true);
                    try {
                      const pref = await crearPreferencia(pedido.id);
                      window.location.href = pref.init_point;
                    } catch (e) {
                      setRetryError(e instanceof Error ? e.message : 'Error al iniciar el pago');
                      setRetryLoading(false);
                    }
                  }}
                  className="flex items-center gap-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors w-fit"
                >
                  <RefreshCw size={14} className={retryLoading ? 'animate-spin' : ''} />
                  {retryLoading ? 'Redirigiendo...' : 'Reintentar pago'}
                </button>
                {retryError && <p className="text-red-500 text-xs">{retryError}</p>}
              </div>
            )}
        </div>
      )}

      {/* Historial de estados */}
      {pedido.historial && pedido.historial.length > 0 && (
        <TimelinePedido historial={pedido.historial} />
      )}

      {/* Cancelar pedido */}
      {(estadoEfectivo === 'PENDIENTE' || estadoEfectivo === 'CONFIRMADO') && (
        <div className="mt-4">
          <button
            onClick={() => setModalCancelar(true)}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium"
          >
            Cancelar pedido
          </button>
        </div>
      )}

      <ModalMotivo
        isOpen={modalCancelar}
        onClose={() => setModalCancelar(false)}
        onConfirm={(motivo) => mutCancelar.mutate(motivo)}
        title="Cancelar pedido"
        description="¿Por qué querés cancelar este pedido? El motivo es obligatorio."
        confirmLabel="Cancelar pedido"
        isLoading={mutCancelar.isPending}
      />
    </div>
  );
}
