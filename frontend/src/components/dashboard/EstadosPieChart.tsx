import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { EstadoCount } from '../../api/admin';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#eab308'];

interface Props {
  data: EstadoCount[];
}

export default function EstadosPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Sin datos de pedidos</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Pedidos por estado</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="cantidad"
            nameKey="estado"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ estado, percent }) =>
              `${estado} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [v, 'Pedidos']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
