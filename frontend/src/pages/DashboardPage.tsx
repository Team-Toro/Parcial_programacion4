import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../api/admin';
import KpiCard from '../components/dashboard/KpiCard';
import EstadosPieChart from '../components/dashboard/EstadosPieChart';
import VentasLineChart from '../components/dashboard/VentasLineChart';
import TopProductosTable from '../components/dashboard/TopProductosTable';
import PedidosRecientesTable from '../components/dashboard/PedidosRecientesTable';
import { SkeletonTable } from '../components/Skeleton';

const fmt = (n: number) =>
  `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <span className="text-xs text-slate-400">Actualización automática cada 30 s</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
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
