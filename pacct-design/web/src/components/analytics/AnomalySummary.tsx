'use client';

import type { ScenarioAnalyticsResponse, AnomalyFinding } from './analytics-types';

interface Props {
  data: ScenarioAnalyticsResponse;
  onSelectAnomaly?: (metric: string) => void;
}

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  high: { label: 'High', bg: 'var(--rm-fail-muted)', color: 'var(--rm-fail)' },
  medium: { label: 'Medium', bg: 'var(--rm-caution-muted)', color: 'var(--rm-caution)' },
  low: { label: 'Low', bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' },
};

function formatMetricValue(metric: string, value: number): string {
  const m = metric.toLowerCase();
  if (m.includes('latency') || m.includes('p50') || m.includes('p95') || m.includes('p99')) return `${Math.round(value)}ms`;
  if (m.includes('throughput') || m.includes('rps')) return `${value.toFixed(1)} rps`;
  if (m.includes('rate')) return `${value.toFixed(2)}%`;
  if (m.includes('bytes')) {
    if (value === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(Math.abs(value)) / Math.log(1024)), units.length - 1);
    return `${(value / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
  if (m.includes('duration')) return `${value.toFixed(1)}s`;
  return value.toFixed(2);
}

function formatDelta(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export default function AnomalySummary({ data, onSelectAnomaly }: Props) {
  const sorted = [...data.anomalies].sort((a: AnomalyFinding, b: AnomalyFinding) => {
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const sDiff = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    if (sDiff !== 0) return sDiff;
    return Math.abs(b.percent_delta) - Math.abs(a.percent_delta);
  });

  if (sorted.length === 0) {
    return (
      <div
        className="text-center py-8"
        style={{
          background: 'var(--rm-bg-surface)',
          border: '1px solid var(--rm-border)',
          borderRadius: 12,
        }}
      >
        <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
          No notable anomalies detected in the selected scope.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--rm-bg-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="px-5 py-3"
        style={{ borderBottom: '1px solid var(--rm-border)' }}
      >
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>
          Anomalies
        </h3>
      </div>

      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--rm-border)' }}>
            {['Metric', 'Current', 'Baseline', 'Delta', 'Severity', ''].map((h) => (
              <th
                key={h || 'action'}
                className="px-5 py-2.5 text-left"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--rm-text-muted)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const sev = SEVERITY_CONFIG[a.severity] ?? SEVERITY_CONFIG.low;

            return (
              <tr
                key={a.metric}
                className="transition-colors"
                style={{ borderBottom: '1px solid var(--rm-border)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--rm-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '';
                }}
              >
                <td className="px-5 py-3">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
                    {a.metric}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-[13px] font-mono" style={{ color: 'var(--rm-text-secondary)' }}>
                    {formatMetricValue(a.metric, a.current)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-[13px] font-mono" style={{ color: 'var(--rm-text-muted)' }}>
                    {formatMetricValue(a.metric, a.baseline)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-[13px] font-semibold font-mono"
                    style={{ color: a.percent_delta > 0 ? 'var(--rm-fail)' : 'var(--rm-pass)' }}
                  >
                    {formatDelta(a.percent_delta)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                    style={{ background: sev.bg, color: sev.color }}
                  >
                    {sev.label}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  {onSelectAnomaly && (
                    <button
                      onClick={() => onSelectAnomaly(a.metric)}
                      className="text-[12px] font-medium transition-colors"
                      style={{ color: 'var(--rm-signal)' }}
                    >
                      View trend
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
