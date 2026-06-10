import type { TopProducto } from '../../api/admin';

interface Props {
  data: TopProducto[];
}

export default function TopProductosTable({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Top 5 productos</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
            <th className="pb-2 font-medium w-6">#</th>
            <th className="pb-2 font-medium">Producto</th>
            <th className="pb-2 font-medium text-right">Unidades</th>
            <th className="pb-2 font-medium text-right">Ventas</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              <td className="py-2.5 text-slate-400 font-medium">{i + 1}</td>
              <td className="py-2.5 font-medium text-slate-700">{p.nombre}</td>
              <td className="py-2.5 text-right text-slate-600">{p.total_unidades}</td>
              <td className="py-2.5 text-right text-orange-600 font-medium">
                ${p.total_ventas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                Sin ventas registradas
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
