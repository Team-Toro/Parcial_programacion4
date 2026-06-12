import { useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { cancelarPedido } from '../api/pedidos';
import { useCarritoStore } from '../store/carritoStore';

export default function FailurePage() {
  const { pedido_id } = useParams<{ pedido_id: string }>();
  const pedidoId = Number(pedido_id);
  const navigate = useNavigate();
  const { vaciarCarrito } = useCarritoStore();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const mutCancelar = useMutation({
    mutationFn: () => cancelarPedido(pedidoId, 'Pago cancelado por el cliente'),
    onSuccess: () => {
      vaciarCarrito();
      navigate('/mis-pedidos', { replace: true });
    },
  });

  if (isNaN(pedidoId)) return <Navigate to="/mis-pedidos" replace />;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">El pago no se completó</h1>
      <p className="text-slate-500 mb-6">
        Tu pago fue rechazado o cancelado. Podés reintentar el pago o cancelar el pedido.
      </p>

      {!confirmCancel ? (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(`/pagos/${pedidoId}`)}
            className="bg-[#009ee3] hover:bg-[#007dc3] text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Reintentar pago
          </button>
          <Link
            to="/mis-pedidos"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Volver a mis pedidos
          </Link>
          <button
            onClick={() => setConfirmCancel(true)}
            className="text-red-500 hover:text-red-700 text-sm underline mt-1"
          >
            Cancelar pedido
          </button>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 font-medium mb-4">
            ¿Confirmás que querés cancelar el pedido? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => mutCancelar.mutate()}
              disabled={mutCancelar.isPending}
              className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              {mutCancelar.isPending ? 'Cancelando...' : 'Sí, cancelar pedido'}
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Volver
            </button>
          </div>
          {mutCancelar.isError && (
            <p className="text-red-500 text-xs mt-3">
              {mutCancelar.error instanceof Error ? mutCancelar.error.message : 'Error al cancelar el pedido'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
