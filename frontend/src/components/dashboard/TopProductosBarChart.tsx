import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { TopProducto } from '../../api/admin';

interface Props {
  data: TopProducto[];
}

export default function TopProductosBarChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <p className="text-slate-400 text-sm">Sin ventas registradas</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    nombre: d.nombre.length > 15 ? d.nombre.slice(0, 15) + '…' : d.nombre,
    cantidad: d.total_unidades,
    ingresos: Number(d.total_ventas),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="nombre"
          angle={-25}
          textAnchor="end"
          tick={{ fontSize: 12 }}
          interval={0}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, name: string) =>
            name === 'Ingresos'
              ? [`$${value.toLocaleString('es-AR')}`, name]
              : [`${value} unidades`, name]
          }
        />
        <Bar dataKey="cantidad" fill="#f97316" name="Unidades vendidas" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
