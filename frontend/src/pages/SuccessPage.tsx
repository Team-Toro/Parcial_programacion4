import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, Navigate } from 'react-router-dom';
import { confirmarPago, getPagoByPedido } from '../api/pagos';
import { getPedido } from '../api/pedidos';
import type { Pedido } from '../types';
import { usePaymentStore } from '../store/paymentStore';
import { useCarritoStore } from '../store/carritoStore';

type ResultadoPago = 'cargando' | 'aprobado' | 'pendiente' | 'rechazado';

function mpStatusToResultado(status: string): ResultadoPago {
  if (status === 'approved') return 'aprobado';
  if (status === 'rejected' || status === 'cancelled') return 'rechazado';
  return 'pendiente';
}

export default function SuccessPage() {
  const { pedido_id } = useParams<{ pedido_id: string }>();
  const [searchParams] = useSearchParams();
  const pedidoId = Number(pedido_id);

  const [resultado, setResultado] = useState<ResultadoPago>('cargando');
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { setStatus, reset } = usePaymentStore();
  const { vaciarCarrito } = useCarritoStore();

  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  useEffect(() => {
    if (isNaN(pedidoId)) return;

    const paymentIdStr = searchParams.get('payment_id') ?? searchParams.get('collection_id');
    const paymentId = paymentIdStr ? Number(paymentIdStr) : null;

    const verificar = async () => {
      setStatus('verifying');
      try {
        const pedidoData = await getPedido(pedidoId);
        setPedido(pedidoData);

        if (paymentId) {
          const res = await confirmarPago(pedidoId, paymentId);
          const r = mpStatusToResultado(res.estado);
          setResultado(r);
          if (r === 'aprobado') { setStatus('approved'); vaciarCarrito(); }
          else if (r === 'rechazado') setStatus('rejected');
        } else {
          // Sin payment_id: consultar estado actual del pago (webhook ya lo procesó)
          try {
            const pago = await getPagoByPedido(pedidoId);
            const r = mpStatusToResultado(pago.mp_status);
            setResultado(r);
            if (r === 'aprobado') { setStatus('approved'); vaciarCarrito(); }
            else if (r === 'rechazado') setStatus('rejected');
          } catch {
            setResultado('pendiente');
          }
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Error al verificar el pago');
        setResultado('rechazado');
        setStatus('rejected');
      }
    };

    verificar();
  }, [pedidoId, searchParams, setStatus]);

  if (isNaN(pedidoId)) return <Navigate to="/mis-pedidos" replace />;

  if (resultado === 'cargando') {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500">Verificando pago...</p>
      </div>
    );
  }

  if (resultado === 'rechazado') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Pago rechazado</h1>
        <p className="text-slate-500 mb-2">El pago no fue procesado correctamente.</p>
        {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link
            to={`/pagos/${pedidoId}`}
            className="bg-[#009ee3] hover:bg-[#007dc3] text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Reintentar pago
          </Link>
          <Link
            to="/mis-pedidos"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  if (resultado === 'pendiente') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Pago en proceso</h1>
        <p className="text-slate-500 mb-6">
          Tu pago está siendo verificado. Te notificaremos cuando se confirme.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/mis-pedidos"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Ver mis pedidos
          </Link>
          <Link
            to="/productos"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    );
  }

  // resultado === 'aprobado'
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Pago aprobado!</h1>
      {pedido && (
        <p className="text-slate-500 mb-1">
          Pedido #{pedidoId} — ${parseFloat(pedido.total).toFixed(2)}
        </p>
      )}
      <p className="text-slate-500 mb-6">Tu pedido fue confirmado y está siendo preparado.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/mis-pedidos"
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Ver mis pedidos
        </Link>
        <Link
          to="/productos"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
