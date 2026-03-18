'use client';

import { useRouter } from 'next/navigation';
import type { ScenarioAnalyticsResponse, NotableRun } from './analytics-types';

// ---------------------------------------------------------------------------
// Category badge colors
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  most_anomalous:     { bg: 'rgba(220,38,38,0.12)',  color: 'var(--rm-fail)' },
  biggest_regression: { bg: 'rgba(217,119,6,0.12)',   color: 'var(--rm-caution)' },
  slowest:            { bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
  highest_error:      { bg: 'rgba(220,38,38,0.12)',  color: 'var(--rm-fail)' },
  latest_failed:      { bg: 'rgba(220,38,38,0.12)',  color: 'var(--rm-fail)' },
  latest_passed:      { bg: 'rgba(22,163,74,0.12)',  color: 'var(--rm-pass)' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  completed: { bg: 'rgba(22,163,74,0.12)',  color: 'var(--rm-pass)' },
  failed:    { bg: 'rgba(220,38,38,0.12)',  color: 'var(--rm-fail)' },
  running:   { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const thStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--rm-text-muted)',
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '1px solid var(--rm-border)',
};

const tdStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--rm-text)',
  padding: '8px 10px',
  borderBottom: '1px solid var(--rm-border)',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotableRuns({ data }: { data: ScenarioAnalyticsResponse }) {
  const router = useRouter();
  const runs = data.notable_runs;

  return (
    <div
      style={{
        background: 'var(--rm-bg-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 12,
        padding: '20px 24px',
      }}
    >
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--rm-text)', margin: 0, marginBottom: 12 }}>
        Notable Runs
      </h3>

      {(!runs || runs.length === 0) ? (
        <p style={{ fontSize: 12, color: 'var(--rm-text-muted)', margin: 0 }}>
          No notable runs in selected scope
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Run</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Value</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run: NotableRun) => {
                const catCfg = CATEGORY_COLORS[run.category] ?? { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' };
                const statusCfg = STATUS_COLORS[run.status] ?? { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' };

                return (
                  <tr
                    key={`${run.category}-${run.run_id}`}
                    onClick={() => router.push(`/dashboard/analytics?plan_id=${run.run_id}`)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--rm-bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    {/* Category badge */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: catCfg.bg,
                          color: catCfg.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {run.label}
                      </span>
                    </td>

                    {/* Run ID */}
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--rm-signal)', fontFamily: 'monospace', fontSize: 12 }}>
                        {truncateId(run.run_id)}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ ...tdStyle, color: 'var(--rm-text-secondary)' }}>
                      {formatDate(run.created_at)}
                    </td>

                    {/* Status badge */}
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          textTransform: 'capitalize',
                        }}
                      >
                        {run.status}
                      </span>
                    </td>

                    {/* Value */}
                    <td style={{ ...tdStyle, color: 'var(--rm-text-secondary)', fontSize: 12 }}>
                      {String(run.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
