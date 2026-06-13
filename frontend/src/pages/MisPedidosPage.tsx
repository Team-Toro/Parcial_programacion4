import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMisPedidos } from '../api/pedidos';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWsStore } from '../store/wsStore';
import { useUiStore } from '../store/uiStore';
import { SkeletonTable } from '../components/Skeleton';

const TERMINALES = new Set(['ENTREGADO', 'CANCELADO']);

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  EN_PREP: 'bg-purple-100 text-purple-700',
  EN_CAMINO: 'bg-indigo-100 text-indigo-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

function EstadoBadge({ codigo }: { codigo: string }) {
  const cls = ESTADO_COLORS[codigo] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {codigo}
    </span>
  );
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZE = 10;

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  EN_PREP: 'En preparación',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export default function MisPedidosPage() {
  const [offset, setOffset] = useState(0);
  const [activeTab, setActiveTab] = useState<'proceso' | 'historial'>('proceso');
  const { subscribeToOrder, unsubscribeFromOrder } = useWebSocket();
  const estadosRT = useWsStore((s) => s.estadosRT);
  const addToast = useUiStore((s) => s.addToast);
  const prevEstadosRT = useRef<Record<number, string>>({});

  const { data: pedidos = [], isLoading, isError } = useQuery({
    queryKey: ['mis-pedidos', offset],
    queryFn: () => getMisPedidos(offset, PAGE_SIZE),
  });

  useEffect(() => {
    const activeIds = pedidos.filter((p) => !TERMINALES.has(p.estado_codigo)).map((p) => p.id);
    activeIds.forEach(subscribeToOrder);
    return () => { activeIds.forEach(unsubscribeFromOrder); };
  }, [pedidos, subscribeToOrder, unsubscribeFromOrder]);

  useEffect(() => {
    const prev = prevEstadosRT.current;
    for (const [idStr, newEstado] of Object.entries(estadosRT)) {
      const id = Number(idStr);
      if (prev[id] !== newEstado) {
        const label = ESTADO_LABELS[newEstado] ?? newEstado;
        const tipo = newEstado === 'CANCELADO' ? 'error' : newEstado === 'ENTREGADO' ? 'success' : 'info';
        addToast(tipo, `Pedido #${id}: ${label}`);
      }
    }
    prevEstadosRT.current = { ...estadosRT };
  }, [estadosRT, addToast]);

  const enProceso = pedidos.filter((p) => !TERMINALES.has(estadosRT[p.id] ?? p.estado_codigo));
  const historial = pedidos.filter((p) => TERMINALES.has(estadosRT[p.id] ?? p.estado_codigo));
  const pedidosVisibles = activeTab === 'proceso' ? enProceso : historial;

  const handleTabChange = (tab: 'proceso' | 'historial') => {
    setActiveTab(tab);
    setOffset(0);
  };

  if (isLoading) return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-5xl mx-auto">
      <div className="h-9 w-36 bg-gray-200 animate-pulse rounded mb-6" />
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
  if (isError) return <div className="p-8 text-red-500">Error al cargar pedidos.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mis pedidos</h1>

      {pedidos.length === 0 && offset === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500 mb-4">No tenés pedidos todavía.</p>
          <Link
            to="/productos"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Ver productos
          </Link>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-4">
            <button
              onClick={() => handleTabChange('proceso')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'proceso'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              En proceso ({enProceso.length})
            </button>
            <button
              onClick={() => handleTabChange('historial')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'historial'
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Historial ({historial.length})
            </button>
          </div>

          {pedidosVisibles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {activeTab === 'proceso' ? 'No tenés pedidos en proceso.' : 'No hay pedidos en tu historial.'}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Pedido</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Fecha</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Forma de pago</th>
                    <th className="text-left px-4 py-3 text-slate-600 font-semibold">Estado</th>
                    <th className="text-right px-4 py-3 text-slate-600 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidosVisibles.map((p) => {
                    const estadoEfectivo = estadosRT[p.id] ?? p.estado_codigo;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            to={`/mis-pedidos/${p.id}`}
                            className="text-orange-500 hover:underline font-medium"
                          >
                            #{p.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatFecha(p.created_at)}</td>
                        <td className="px-4 py-3 text-slate-600">{p.forma_pago_codigo}</td>
                        <td className="px-4 py-3">
                          <EstadoBadge codigo={estadoEfectivo} />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          ${Number(p.total).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-500">Página {Math.floor(offset / PAGE_SIZE) + 1}</span>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={pedidos.length < PAGE_SIZE}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  );
}
