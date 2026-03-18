type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

const dotColors: Record<HealthStatus, string> = {
  healthy: 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]',
  degraded: 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]',
  unhealthy: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
};

const labels: Record<HealthStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
};

export function HealthIndicator({ status }: { status: HealthStatus }) {
  const dotClass = dotColors[status] ?? dotColors.unhealthy;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} />
      <span className="text-xs font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>
        {labels[status] ?? 'Unknown'}
      </span>
    </span>
  );
}
