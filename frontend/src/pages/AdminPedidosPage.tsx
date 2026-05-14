import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllPedidos } from '../api/pedidos';
import { useAuthStore } from '../store/authStore';

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  EN_PREP: 'bg-purple-100 text-purple-700',
  EN_CAMINO: 'bg-indigo-100 text-indigo-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

const ESTADOS = ['', 'PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'];

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZE = 15;
const STAFF_ROLES = ['ADMIN', 'PEDIDOS'];

export default function AdminPedidosPage() {
  const user = useAuthStore((s) => s.user);
  const isStaff = user?.roles?.some((r) => STAFF_ROLES.includes(r)) ?? false;

  const [usuarioIdInput, setUsuarioIdInput] = useState('');
  const [estadoCodigo, setEstadoCodigo] = useState('');
  const [offset, setOffset] = useState(0);

  if (!isStaff) return <Navigate to="/productos" replace />;

  const usuarioId = usuarioIdInput.trim() ? Number(usuarioIdInput) : undefined;

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['admin-pedidos', usuarioId, estadoCodigo, offset],
    queryFn: () =>
      getAllPedidos({
        usuario_id: usuarioId,
        estado_codigo: estadoCodigo || undefined,
        offset,
        limit: PAGE_SIZE,
      }),
  });

  const handleFiltrar = () => {
    setOffset(0);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Gestión de pedidos</h1>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">ID de usuario</label>
          <input
            type="number"
            min="1"
            value={usuarioIdInput}
            onChange={(e) => setUsuarioIdInput(e.target.value)}
            placeholder="Todos"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Estado</label>
          <select
            value={estadoCodigo}
            onChange={(e) => setEstadoCodigo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e || 'Todos los estados'}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFiltrar}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Filtrar
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500 text-sm">Cargando...</p>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No se encontraron pedidos con los filtros aplicados.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">ID</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Forma de pago</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Estado</th>
                  <th className="text-right px-4 py-3 text-slate-600 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/mis-pedidos/${p.id}`}
                        className="text-orange-500 hover:underline font-medium"
                      >
                        #{p.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.usuario_id}</td>
                    <td className="px-4 py-3 text-slate-600">{formatFecha(p.created_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{p.forma_pago_codigo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ESTADO_COLORS[p.estado_codigo] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.estado_codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      ${Number(p.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
