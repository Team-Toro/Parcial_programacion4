import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { getDashboardStats } from '../api/admin';
import KpiCard from '../components/dashboard/KpiCard';
import EstadosPieChart from '../components/dashboard/EstadosPieChart';
import VentasLineChart from '../components/dashboard/VentasLineChart';
import TopProductosTable from '../components/dashboard/TopProductosTable';
import PedidosRecientesTable from '../components/dashboard/PedidosRecientesTable';
import { SkeletonTable } from '../components/Skeleton';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isRefetching, dataUpdatedAt } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(interval);
  }, []);

  const ageSeconds = dataUpdatedAt ? Math.max(0, Math.floor((now - dataUpdatedAt) / 1000)) : 0;
  const ageText = ageSeconds < 60 ? `hace ${ageSeconds}s` : `hace ${Math.floor(ageSeconds / 60)}m`;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
        <SkeletonTable rows={4} cols={3} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Dashboard</h1>
        <p className="text-red-600 text-sm">Error al cargar el dashboard. Verificá tu sesión e intentá de nuevo.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-slate-500">Actualizado {ageText}</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Ventas totales"    value={fmt(data.ventas_totales)}   color="orange" icon="💰" />
        <KpiCard title="Pedidos hoy"       value={data.pedidos_hoy}           color="blue"   icon="📦" />
        <KpiCard title="Pedidos este mes"  value={data.pedidos_mes}           color="indigo" icon="📅" />
        <KpiCard title="Ticket promedio"   value={fmt(data.ticket_promedio)}  color="green"  icon="🎫" />
        <KpiCard title="Clientes activos"  value={data.total_clientes}        color="purple" icon="👤" />
        <KpiCard title="Productos activos" value={data.productos_activos}     color="red"    icon="🍽️" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VentasLineChart  data={data.ventas_por_dia} />
        <EstadosPieChart  data={data.estados} />
      </div>

      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductosTable       data={data.top_productos} />
        <PedidosRecientesTable   data={data.pedidos_recientes} />
      </div>
    </div>
  );
}
