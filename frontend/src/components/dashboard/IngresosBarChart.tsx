import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { IngresoPorFormaPago } from '../../api/admin';

const COLORES: Record<string, string> = {
  MERCADOPAGO: '#3b82f6',
  EFECTIVO: '#10b981',
  TRANSFERENCIA: '#f59e0b',
};

interface Props {
  data: IngresoPorFormaPago[];
}

export default function IngresosBarChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-slate-400 text-sm">Sin ingresos registrados</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    forma: d.forma_pago_codigo,
    ingresos: Number(d.total_ingresos),
    pedidos: d.cantidad_pedidos,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="forma" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'Ingresos'
              ? [`$${value.toLocaleString('es-AR')}`, name]
              : [`${value} pedidos`, name]
          }
        />
        <Bar dataKey="ingresos" name="Ingresos" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={COLORES[entry.forma] ?? '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
