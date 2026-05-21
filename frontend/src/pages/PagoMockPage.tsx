import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { simularWebhookMP } from '../api/pagos';

export default function PagoMockPage() {
  const { external_reference } = useParams<{ external_reference: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { pedido_id: number; monto: string } | null;

  const mutation = useMutation({
    mutationFn: (mp_status: 'approved' | 'rejected') =>
      simularWebhookMP({
        external_reference: external_reference!,
        mp_status,
        payment_method_id: 'visa',
      }),
    onSuccess: (_data, mp_status) => {
      navigate(`/mis-pedidos/${state?.pedido_id ?? ''}`, {
        state: {
          toastMsg:
            mp_status === 'approved'
              ? 'Pago aprobado. Tu pedido fue confirmado.'
              : 'Pago rechazado. Podés reintentar desde tu pedido.',
        },
      });
    },
  });

  const monto = state?.monto ?? '0.00';
  const pedidoId = state?.pedido_id;

  return (
    <div className="min-h-screen bg-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header estilo MP */}
        <div className="bg-cyan-500 px-6 py-4">
          <p className="text-white font-bold text-lg tracking-tight">
            Pago con MercadoPago{' '}
            <span className="text-cyan-200 text-xs font-normal ml-2">[MOCK]</span>
          </p>
        </div>

        {/* Card de pago */}
        <div className="px-6 py-8 text-center">
          <p className="text-slate-500 text-sm mb-1">Monto a pagar</p>
          <p className="text-4xl font-bold text-slate-800 mb-2">
            ${Number(monto).toFixed(2)}
          </p>
          {pedidoId && (
            <p className="text-slate-400 text-sm mb-8">Pedido #{pedidoId}</p>
          )}

          {/* Tarjeta visual */}
          <div className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl p-4 mb-8 text-white text-left shadow-md">
            <p className="text-xs opacity-70 mb-4">Tarjeta de crédito</p>
            <p className="font-mono text-lg tracking-widest">•••• •••• •••• 4242</p>
            <div className="flex justify-between mt-3 text-xs opacity-70">
              <span>TITULAR DEMO</span>
              <span>12/27</span>
            </div>
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={() => mutation.mutate('approved')}
              disabled={mutation.isPending}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              {mutation.isPending ? 'Procesando...' : 'Aprobar pago'}
            </button>
            <button
              onClick={() => mutation.mutate('rejected')}
              disabled={mutation.isPending}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Rechazar pago
            </button>
            <button
              onClick={() =>
                navigate(pedidoId ? `/mis-pedidos/${pedidoId}` : '/mis-pedidos')
              }
              disabled={mutation.isPending}
              className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Cancelar y volver
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 px-6 pb-4">
          Esto es un simulador para demostración. En producción se integraría con MercadoPago Checkout API.
        </p>
      </div>
    </div>
  );
}
