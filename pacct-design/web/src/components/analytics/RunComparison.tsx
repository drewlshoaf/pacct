'use client';

import type { ScenarioAnalyticsResponse, MetricComparison } from './analytics-types';

interface Props {
  data: ScenarioAnalyticsResponse;
}

// ─── Metric display config ──────────────────────────────────────────────

const LOWER_IS_BETTER = new Set([
  'P50 Latency', 'P95 Latency', 'P99 Latency',
  'Error Rate', 'Timeout Rate', 'Duration', 'Gate Failures',
]);

function fmtValue(metric: string, value: number): string {
  const m = metric.toLowerCase();
  if (m.includes('latency') || m.includes('p50') || m.includes('p95') || m.includes('p99')) return `${Math.round(value)} ms`;
  if (m.includes('throughput') || m.includes('rps')) return `${value.toFixed(1)} rps`;
  if (m.includes('rate')) return `${value.toFixed(2)}%`;
  if (m.includes('bytes')) {
    if (value < 1024) return `${value} B`;
    if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1048576).toFixed(1)} MB`;
  }
  if (m.includes('duration')) {
    if (value < 60) return `${value.toFixed(1)}s`;
    return `${Math.floor(value / 60)}m ${(value % 60).toFixed(0)}s`;
  }
  return value.toLocaleString();
}

// ─── Component ───────────────────────────────────────────────────────────

export default function RunComparison({ data }: Props) {
  const { comparison, baseline_mode } = data;

  const comparisonLabel =
    baseline_mode === 'prev'
      ? 'Previous Run'
      : baseline_mode === 'last5'
        ? 'Avg Last 5'
        : 'Avg Last 10';

  if (comparison.length === 0) {
    return (
      <div
        style={{
          background: 'var(--rm-bg-surface)',
          border: '1px solid var(--rm-border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>
          Run-to-Run Comparison
        </h3>
        <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          Not enough runs for comparison.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--rm-bg-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>
        Run-to-Run Comparison
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rm-border)' }}>
              {['Metric', 'Current', comparisonLabel, 'Delta', 'Δ%', ''].map((h, i) => (
                <th
                  key={i}
                  className="text-left px-3 py-2 font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--rm-text-muted)', fontSize: 10 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.map((m: MetricComparison) => {
              const lowerBetter = LOWER_IS_BETTER.has(m.metric);
              const negligible = Math.abs(m.delta) < 0.001;
              const isRegression = lowerBetter ? m.delta > 0 : m.delta < 0;
              const isImprovement = lowerBetter ? m.delta < 0 : m.delta > 0;
              const deltaColor = negligible
                ? 'var(--rm-text-muted)'
                : isRegression
                  ? 'var(--rm-fail)'
                  : isImprovement
                    ? 'var(--rm-pass)'
                    : 'var(--rm-text-muted)';

              const sign = m.delta > 0 ? '+' : m.delta < 0 ? '\u2212' : '';
              const pctSign = m.percent_delta > 0 ? '+' : m.percent_delta < 0 ? '\u2212' : '';

              return (
                <tr
                  key={m.metric}
                  style={{
                    borderBottom: '1px solid var(--rm-border)',
                    background: m.anomaly ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                  }}
                >
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--rm-text)' }}>
                    {m.metric}
                  </td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--rm-text)' }}>
                    {fmtValue(m.metric, m.current)}
                  </td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--rm-text-secondary)' }}>
                    {fmtValue(m.metric, m.comparison)}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium" style={{ color: deltaColor }}>
                    {sign}{fmtValue(m.metric, Math.abs(m.delta))}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium" style={{ color: deltaColor }}>
                    {pctSign}{Math.abs(m.percent_delta).toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-center">
                    {m.anomaly && (
                      <span
                        title="Anomaly detected"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                        style={{ background: 'var(--rm-fail)', color: '#fff' }}
                      >
                        !
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
