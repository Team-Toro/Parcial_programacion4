import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { VentasPorDia } from '../../api/admin';

interface Props {
  data: VentasPorDia[];
}

export default function VentasLineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">Sin ventas en los últimos 14 días</p>
      </div>
    );
  }

  // El backend serializa los montos como string (Decimal) → coercionar a number para graficar.
  const chartData = data.map((d) => ({ fecha: d.fecha, total: Number(d.total) }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">Ventas últimos 14 días</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="ventasGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `$${v}`}
            width={60}
          />
          <Tooltip
            formatter={(v: number) => [
              `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
              'Ventas',
            ]}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#f97316"
            fill="url(#ventasGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
