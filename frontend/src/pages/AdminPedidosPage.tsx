import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllPedidos, avanzarEstadoPedido, cancelarPedido } from '../api/pedidos';
import { useAuthStore } from '../store/authStore';
import ModalMotivo from '../components/pedidos/ModalMotivo';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWsStore } from '../store/wsStore';
import { SkeletonTable } from '../components/Skeleton';

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  EN_PREP: 'bg-purple-100 text-purple-700',
  EN_CAMINO: 'bg-indigo-100 text-indigo-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
};

const ESTADOS = ['', 'PENDIENTE', 'CONFIRMADO', 'EN_PREP', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'];

const TRANSICIONES: Record<string, string[]> = {
  PENDIENTE:  ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['EN_PREP',    'CANCELADO'],
  EN_PREP:    ['EN_CAMINO',  'CANCELADO'],
  EN_CAMINO:  ['ENTREGADO'],
  ENTREGADO:  [],
  CANCELADO:  [],
};

const TERMINALES = new Set(['ENTREGADO', 'CANCELADO']);

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

  const [usuarioIdFilter, setUsuarioIdFilter] = useState<number | undefined>(undefined);
  const [estadoCodigo, setEstadoCodigo] = useState('');
  const [offset, setOffset] = useState(0);
  const [pedidoACancelar, setPedidoACancelar] = useState<number | null>(null);
  const [flashedIds, setFlashedIds] = useState<Set<number>>(new Set());
  const prevEstadosRT = useRef<Record<number, string>>({});
  const flashTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const queryClient = useQueryClient();
  useWebSocket();
  const { newPedidoAlert, clearNewPedidoAlert, estadosRT } = useWsStore();

  // Invalidate the list when a new pedido arrives
  useEffect(() => {
    if (newPedidoAlert) {
      queryClient.invalidateQueries({ queryKey: ['admin-pedidos'] });
    }
  }, [newPedidoAlert, queryClient]);

  // Flash rows when their estado changes via WS
  useEffect(() => {
    const prev = prevEstadosRT.current;
    const changed: number[] = [];
    for (const [idStr, newEstado] of Object.entries(estadosRT)) {
      const id = Number(idStr);
      if (prev[id] !== newEstado) changed.push(id);
    }
    prevEstadosRT.current = { ...estadosRT };
    if (changed.length === 0) return;

    setFlashedIds((s) => new Set([...s, ...changed]));
    changed.forEach((id) => {
      if (flashTimers.current.has(id)) clearTimeout(flashTimers.current.get(id)!);
      flashTimers.current.set(id, setTimeout(() => {
        setFlashedIds((s) => { const next = new Set(s); next.delete(id); return next; });
        flashTimers.current.delete(id);
      }, 500));
    });
  }, [estadosRT]);

  if (!isStaff) return <Navigate to="/productos" replace />;

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['admin-pedidos', usuarioIdFilter, estadoCodigo, offset],
    queryFn: () =>
      getAllPedidos({
        usuario_id: usuarioIdFilter,
        estado_codigo: estadoCodigo || undefined,
        offset,
        limit: PAGE_SIZE,
      }),
  });

  const { data: todosPedidos = [] } = useQuery({
    queryKey: ['admin-pedidos-usuarios'],
    queryFn: () => getAllPedidos({ limit: 100 }),
    staleTime: 60_000,
  });

  const usuariosUnicos = useMemo(() => {
    const map = new Map<number, { total: number; activos: number }>();
    todosPedidos.forEach((p) => {
      const entry = map.get(p.usuario_id) ?? { total: 0, activos: 0 };
      entry.total += 1;
      if (!TERMINALES.has(p.estado_codigo)) entry.activos += 1;
      map.set(p.usuario_id, entry);
    });
    return Array.from(map.entries())
      .map(([id, { total, activos }]) => ({ id, total, activos }))
      .sort((a, b) => b.activos - a.activos || a.id - b.id);
  }, [todosPedidos]);

  const mutAvanzar = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      avanzarEstadoPedido(id, { nuevo_estado: estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pedidos'] });
    },
  });

  const mutCancelarAdmin = useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
      cancelarPedido(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pedidos'] });
      setPedidoACancelar(null);
    },
  });

  const handleFiltrar = () => {
    setOffset(0);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Gestión de pedidos</h1>

      {/* Notificación de nuevo pedido */}
      {newPedidoAlert && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-orange-50 border border-orange-300 text-orange-800 rounded-xl px-4 py-3 text-sm font-medium">
          <span>
            Nuevo pedido <strong>#{newPedidoAlert.id}</strong> del usuario{' '}
            <strong>{newPedidoAlert.usuario_id}</strong> — ${Number(newPedidoAlert.total).toFixed(2)}
          </span>
          <button
            onClick={clearNewPedidoAlert}
            className="ml-auto text-orange-600 hover:text-orange-800 font-bold text-lg leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Usuario</label>
          <select
            value={usuarioIdFilter ?? ''}
            onChange={(e) => {
              setUsuarioIdFilter(e.target.value ? Number(e.target.value) : undefined);
              setOffset(0);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Todos los usuarios</option>
            {usuariosUnicos.map((u) => (
              <option key={u.id} value={u.id}>
                Usuario #{u.id} ({u.activos} activos / {u.total} total)
              </option>
            ))}
          </select>
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
        <SkeletonTable rows={8} cols={7} />
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
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.map((p) => {
                  const estadoEfectivo = estadosRT[p.id] ?? p.estado_codigo;
                  const transiciones = TRANSICIONES[estadoEfectivo] ?? [];
                  const esTerminal = TERMINALES.has(estadoEfectivo);
                  const siguienteEstado = transiciones.find((t) => t !== 'CANCELADO') ?? null;
                  const puedeAvanzar = !esTerminal && siguienteEstado !== null;
                  const puedeCancelar = !esTerminal && transiciones.includes('CANCELADO');

                  const isFlashing = flashedIds.has(p.id);
                  return (
                    <tr key={p.id} className={`transition-colors duration-500 ${isFlashing ? 'bg-orange-100' : 'bg-white hover:bg-slate-50'}`}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/pedidos/${p.id}`}
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
                            ESTADO_COLORS[estadoEfectivo] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {estadoEfectivo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        ${Number(p.total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {puedeAvanzar && (
                            <button
                              onClick={() =>
                                mutAvanzar.mutate({ id: p.id, estado: siguienteEstado! })
                              }
                              disabled={mutAvanzar.isPending}
                              className="px-2.5 py-1 text-xs rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium disabled:opacity-50 whitespace-nowrap"
                            >
                              {siguienteEstado}
                            </button>
                          )}
                          {puedeCancelar && (
                            <button
                              onClick={() => setPedidoACancelar(p.id)}
                              disabled={mutCancelarAdmin.isPending}
                              className="px-2.5 py-1 text-xs rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      <ModalMotivo
        isOpen={pedidoACancelar !== null}
        onClose={() => setPedidoACancelar(null)}
        onConfirm={(motivo) => {
          if (pedidoACancelar !== null) {
            mutCancelarAdmin.mutate({ id: pedidoACancelar, motivo });
          }
        }}
        title="Cancelar pedido"
        description="Ingresá el motivo de la cancelación. El motivo es obligatorio."
        confirmLabel="Cancelar pedido"
        isLoading={mutCancelarAdmin.isPending}
      />
    </div>
  );
}
