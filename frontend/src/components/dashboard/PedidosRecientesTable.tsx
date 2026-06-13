import type { PedidoReciente } from '../../api/admin';

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:       'bg-yellow-100 text-yellow-700',
  CONFIRMADO:      'bg-blue-100 text-blue-700',
  EN_PREPARACION:  'bg-purple-100 text-purple-700',
  EN_CAMINO:       'bg-indigo-100 text-indigo-700',
  ENTREGADO:       'bg-green-100 text-green-700',
  CANCELADO:       'bg-red-100 text-red-700',
};

interface Props {
  data: PedidoReciente[];
}

export default function PedidosRecientesTable({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Últimos 10 pedidos</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
              <th className="pb-2 font-medium">ID</th>
              <th className="pb-2 font-medium">Cliente</th>
              <th className="pb-2 font-medium">Estado</th>
              <th className="pb-2 font-medium pl-4">Fecha</th>
              <th className="pb-2 text-right font-medium pr-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-mono text-slate-400 text-xs">#{p.id}</td>
                <td className="py-2.5">
                  <span className="font-medium text-slate-700">{p.cliente}</span>
                  <span className="block text-xs text-slate-400">{p.email}</span>
                </td>
                <td className="py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      ESTADO_BADGE[p.estado] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {p.estado}
                  </span>
                </td>
                <td className="py-2.5 text-slate-400 text-xs pl-4">
                  {new Date(p.created_at).toLocaleDateString('es-AR')}
                </td>
                <td className="py-2.5 text-right font-medium text-slate-700 pr-4">
                ${Number(p.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                  Sin pedidos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
