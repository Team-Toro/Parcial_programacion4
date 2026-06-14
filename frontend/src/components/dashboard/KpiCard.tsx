import { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: string;
  color?: 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'indigo';
}

const COLOR_CLASSES: Record<NonNullable<KpiCardProps['color']>, string> = {
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  blue:   'bg-blue-50 text-blue-600 border-blue-200',
  green:  'bg-green-50 text-green-600 border-green-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  red:    'bg-red-50 text-red-600 border-red-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
};

export default function KpiCard({ title, value, subtitle, icon, color = 'orange' }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-5 flex items-start gap-3 min-h-[110px] ${COLOR_CLASSES[color]}`}>
      {icon && <span className="text-2xl mt-0.5 select-none flex-shrink-0">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70 break-words leading-tight">{title}</p>
        <p className="text-xl md:text-2xl font-bold mt-2 break-words leading-tight" title={String(value)}>{value}</p>
        {subtitle && <p className="text-xs mt-1 opacity-60 break-words">{subtitle}</p>}
      </div>
    </div>
  );
}
