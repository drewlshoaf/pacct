interface StatProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  icon?: string;
  className?: string;
  mode?: 'light' | 'dark';
}

export default function Stat({ label, value, change, icon, className = '', mode = 'dark' }: StatProps) {
  const labelColor = mode === 'light' ? 'text-stone-500' : 'text-stone-400';
  const valueColor = mode === 'light' ? 'text-stone-800' : 'text-stone-100';

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-sm font-medium ${labelColor}`}>{label}</div>
          <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
          {change && (
            <div className={`text-sm mt-1 ${change.positive ? 'text-green-500' : 'text-red-500'}`}>
              {change.positive ? '\u2191' : '\u2193'} {change.value}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-50">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
