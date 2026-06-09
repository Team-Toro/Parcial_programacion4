import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';

export default function FailurePage() {
  const { pedido_id } = useParams<{ pedido_id: string }>();
  const pedidoId = Number(pedido_id);
  const navigate = useNavigate();

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
        Tu pago fue rechazado o cancelado. Podés reintentar el pago o volver a tus pedidos.
      </p>
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
      </div>
    </div>
  );
}
