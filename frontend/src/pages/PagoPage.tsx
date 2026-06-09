import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPedido } from '../api/pedidos';
import { getPagoByPedido } from '../api/pagos';
import PaymentButton from '../components/PaymentButton';
import { useAuthStore } from '../store/authStore';

export default function PagoPage() {
  const { pedido_id } = useParams<{ pedido_id: string }>();
  const pedidoId = Number(pedido_id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    data: pedido,
    isLoading: loadingPedido,
    error: pedidoError,
  } = useQuery({
    queryKey: ['pedido', pedidoId],
    queryFn: () => getPedido(pedidoId),
    enabled: !isNaN(pedidoId),
  });

  const { data: pago, isLoading: loadingPago } = useQuery({
    queryKey: ['pago', pedidoId],
    queryFn: () => getPagoByPedido(pedidoId),
    enabled: !isNaN(pedidoId) && !!pedido,
    retry: false,
  });

  // Si ya está aprobado, ir directamente a success
  useEffect(() => {
    if (pago?.mp_status === 'approved') {
      navigate(`/pagos/${pedidoId}/success`, { replace: true });
    }
  }, [pago, pedidoId, navigate]);

  if (isNaN(pedidoId)) return <Navigate to="/mis-pedidos" replace />;

  if (loadingPedido || (loadingPago && !!pedido)) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500">Cargando información del pago...</p>
      </div>
    );
  }

  if (pedidoError || !pedido) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-red-600 mb-4">No se pudo cargar el pedido.</p>
        <Link to="/mis-pedidos" className="text-orange-500 hover:underline">
          Ver mis pedidos
        </Link>
      </div>
    );
  }

  // Verificar que el pedido pertenece al usuario logueado
  if (user && pedido.usuario_id !== user.id) {
    return <Navigate to="/mis-pedidos" replace />;
  }

  // Verificar forma de pago
  if (pedido.forma_pago_codigo !== 'MERCADOPAGO') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">
          Este pedido no usa MercadoPago como forma de pago.
        </p>
        <Link to={`/mis-pedidos/${pedidoId}`} className="text-orange-500 hover:underline">
          Ver pedido
        </Link>
      </div>
    );
  }

  // Pedido en estado terminal
  if (['CANCELADO', 'ENTREGADO'].includes(pedido.estado_codigo)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">
          Este pedido ya está en estado <strong>{pedido.estado_codigo}</strong>.
        </p>
        <Link to={`/mis-pedidos/${pedidoId}`} className="text-orange-500 hover:underline">
          Ver pedido
        </Link>
      </div>
    );
  }

  const estadoPago = pago?.mp_status ?? 'pending';
  const pagoRechazado = ['rejected', 'cancelled'].includes(estadoPago);
  const totalNum = parseFloat(pedido.total);
  const subtotalNum = parseFloat(pedido.subtotal);
  const costoEnvio = parseFloat(pedido.costo_envio);

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Pagar pedido #{pedidoId}</h1>

      {pagoRechazado && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-5 py-3 mb-6 text-sm">
          El pago fue rechazado o cancelado. Podés intentar nuevamente.
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-5 py-3 mb-6 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Resumen del pedido */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <h2 className="font-bold text-slate-800 mb-4">Resumen del pedido</h2>
        <div className="space-y-2 mb-4">
          {pedido.detalles.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-slate-600">
              <span className="truncate flex-1 mr-2">
                {item.nombre_snapshot} × {item.cantidad}
              </span>
              <span className="flex-shrink-0 font-medium">${item.subtotal_snap}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 pt-3 space-y-1.5">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>${subtotalNum.toFixed(2)}</span>
          </div>
          {costoEnvio > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Costo de envío</span>
              <span>${costoEnvio.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t border-slate-100">
            <span>Total</span>
            <span>${totalNum.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <PaymentButton pedidoId={pedidoId} onError={setErrorMsg} />

      <div className="mt-4 text-center">
        <Link
          to={`/mis-pedidos/${pedidoId}`}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Cancelar y ver pedido
        </Link>
      </div>
    </div>
  );
}
