import { useQuery } from '@tanstack/react-query';
import { Package, AlertTriangle, Ban, DollarSign, TrendingUp } from 'lucide-react';
import { getDashboard } from '../api/admin';

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) return <div className="p-8 text-slate-500">Cargando dashboard...</div>;
  if (isError || !data) return <div className="p-8 text-red-600">Error al cargar el dashboard.</div>;

  const cards = [
    {
      label: 'Total Productos',
      value: data.total_productos,
      icon: Package,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Stock Bajo (< 10)',
      value: data.productos_stock_bajo,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: 'Sin Stock',
      value: data.productos_sin_stock,
      icon: Ban,
      color: 'bg-red-500',
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
    {
      label: 'Valor Inventario',
      value: `$${data.valor_total_inventario.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-green-500',
      bg: 'bg-green-50',
      text: 'text-green-700',
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="w-7 h-7 text-orange-500" />
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`${card.bg} rounded-2xl shadow-sm p-6 border border-slate-200`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${card.text}`}>{card.label}</span>
              <div className={`${card.color} p-2 rounded-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Categorías</h2>
        {data.top_categorias.length === 0 ? (
          <p className="text-slate-400 text-sm">Sin datos de categorías.</p>
        ) : (
          <div className="space-y-3">
            {data.top_categorias.map((cat, idx) => {
              const max = data.top_categorias[0].total_productos;
              const pct = max > 0 ? (cat.total_productos / max) * 100 : 0;
              return (
                <div key={cat.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">
                      <span className="text-slate-400 mr-2">#{idx + 1}</span>
                      {cat.nombre}
                    </span>
                    <span className="text-slate-500">{cat.total_productos} producto{cat.total_productos !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div
                      className="bg-orange-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
