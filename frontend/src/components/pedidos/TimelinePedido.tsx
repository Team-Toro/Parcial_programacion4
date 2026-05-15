import type { HistorialEstadoPedido } from '../../types';

const ESTADO_ICONS: Record<string, string> = {
  PENDIENTE: '🕐',
  CONFIRMADO: '✅',
  EN_PREP: '👨‍🍳',
  EN_CAMINO: '🚚',
  ENTREGADO: '🎉',
  CANCELADO: '❌',
};

const ESTADO_COLORS: Record<string, { dot: string; label: string; line: string }> = {
  PENDIENTE:  { dot: 'bg-amber-400',  label: 'text-amber-700',  line: 'bg-amber-200'  },
  CONFIRMADO: { dot: 'bg-blue-400',   label: 'text-blue-700',   line: 'bg-blue-200'   },
  EN_PREP:    { dot: 'bg-purple-400', label: 'text-purple-700', line: 'bg-purple-200' },
  EN_CAMINO:  { dot: 'bg-indigo-400', label: 'text-indigo-700', line: 'bg-indigo-200' },
  ENTREGADO:  { dot: 'bg-green-500',  label: 'text-green-700',  line: 'bg-green-200'  },
  CANCELADO:  { dot: 'bg-red-500',    label: 'text-red-700',    line: 'bg-red-200'    },
};

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  historial: HistorialEstadoPedido[];
}

export default function TimelinePedido({ historial }: Props) {
  if (!historial || historial.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-5">
      <h2 className="font-semibold text-slate-700 mb-4">Historial de estados</h2>
      <div className="relative">
        {historial.map((entry, idx) => {
          const colors = ESTADO_COLORS[entry.estado_hacia] ?? {
            dot: 'bg-slate-400',
            label: 'text-slate-700',
            line: 'bg-slate-200',
          };
          const isLast = idx === historial.length - 1;

          return (
            <div key={entry.id} className="flex gap-4 relative">
              {/* Dot + line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${colors.dot} z-10 flex-shrink-0`}
                >
                  {ESTADO_ICONS[entry.estado_hacia] ?? '•'}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[2rem] ${colors.line} mt-1`} />
                )}
              </div>

              {/* Content */}
              <div className="pb-5">
                <p className={`font-semibold text-sm ${colors.label}`}>
                  {entry.estado_hacia}
                  {entry.estado_desde && (
                    <span className="text-slate-400 font-normal text-xs ml-2">
                      desde {entry.estado_desde}
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{formatFechaCorta(entry.created_at)}</p>
                {entry.motivo && (
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded px-2 py-1">
                    {entry.motivo}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
