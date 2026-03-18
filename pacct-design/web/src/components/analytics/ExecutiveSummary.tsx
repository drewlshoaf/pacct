'use client';

import type { ScenarioAnalyticsResponse } from './analytics-types';

interface Props {
  data: ScenarioAnalyticsResponse;
}

function formatDelta(pct: number): string {
  const abs = Math.abs(pct);
  return abs < 0.1 ? `${abs.toFixed(2)}%` : `${abs.toFixed(1)}%`;
}

export default function ExecutiveSummary({ data }: Props) {
  const { executive_summary: es } = data;

  const statusColor =
    es.anomaly_status === 'normal'
      ? 'var(--rm-pass)'
      : es.anomaly_status === 'anomalous'
        ? 'var(--rm-fail)'
        : 'var(--rm-caution)';

  const statusLabel =
    es.anomaly_status === 'normal'
      ? 'Normal'
      : es.anomaly_status === 'anomalous'
        ? 'Anomalous'
        : 'Minor Changes';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Card 1: Latest Run */}
      <SummaryCard title="Latest Run">
        <span
          className="text-[20px] font-semibold"
          style={{
            color:
              es.latest_run_status === 'completed'
                ? 'var(--rm-pass)'
                : es.latest_run_status === 'failed'
                  ? 'var(--rm-fail)'
                  : 'var(--rm-text)',
          }}
        >
          {es.latest_run_status === 'none'
            ? 'No runs'
            : es.latest_run_status.charAt(0).toUpperCase() + es.latest_run_status.slice(1)}
        </span>
      </SummaryCard>

      {/* Card 2: Anomaly Status */}
      <SummaryCard title="Status">
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-semibold" style={{ color: statusColor }}>
            {statusLabel}
          </span>
          {es.anomaly_count > 0 && (
            <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
              ({es.anomaly_count} anomal{es.anomaly_count === 1 ? 'y' : 'ies'})
            </span>
          )}
        </div>
      </SummaryCard>

      {/* Card 3: Largest Regression */}
      <SummaryCard title="Largest Regression">
        {es.largest_regression ? (
          <>
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2L6 10M6 10L2 6M6 10L10 6" stroke="var(--rm-fail)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[20px] font-semibold" style={{ color: 'var(--rm-fail)' }}>
                {formatDelta(es.largest_regression.percent_delta)}
              </span>
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              {es.largest_regression.metric}
            </div>
          </>
        ) : (
          <span className="text-[20px] font-semibold" style={{ color: 'var(--rm-text-muted)' }}>
            None
          </span>
        )}
      </SummaryCard>

      {/* Card 4: Largest Improvement */}
      <SummaryCard title="Largest Improvement">
        {es.largest_improvement ? (
          <>
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 10L6 2M6 2L2 6M6 2L10 6" stroke="var(--rm-pass)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[20px] font-semibold" style={{ color: 'var(--rm-pass)' }}>
                {formatDelta(es.largest_improvement.percent_delta)}
              </span>
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              {es.largest_improvement.metric}
            </div>
          </>
        ) : (
          <span className="text-[20px] font-semibold" style={{ color: 'var(--rm-text-muted)' }}>
            None
          </span>
        )}
      </SummaryCard>

      {/* Card 5: Gates */}
      <SummaryCard title="Gates">
        {(es.gate_summary.passed + es.gate_summary.failed) > 0 ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-[20px] font-semibold" style={{ color: 'var(--rm-text)' }}>
                {es.gate_summary.passed}
              </span>
              <span className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>/</span>
              <span className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
                {es.gate_summary.passed + es.gate_summary.failed}
              </span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden mt-2 w-full" style={{ background: 'var(--rm-bg-raised)' }}>
              {es.gate_summary.passed > 0 && (
                <div
                  className="h-full"
                  style={{
                    width: `${(es.gate_summary.passed / (es.gate_summary.passed + es.gate_summary.failed)) * 100}%`,
                    background: 'var(--rm-pass)',
                  }}
                />
              )}
              {es.gate_summary.failed > 0 && (
                <div
                  className="h-full"
                  style={{
                    width: `${(es.gate_summary.failed / (es.gate_summary.passed + es.gate_summary.failed)) * 100}%`,
                    background: 'var(--rm-fail)',
                  }}
                />
              )}
            </div>
            <div className="flex gap-3 mt-1.5 text-[11px]">
              <span style={{ color: 'var(--rm-pass)' }}>{es.gate_summary.passed} passed</span>
              {es.gate_summary.failed > 0 && (
                <span style={{ color: 'var(--rm-fail)' }}>{es.gate_summary.failed} failed</span>
              )}
            </div>
          </>
        ) : (
          <span className="text-[20px] font-semibold" style={{ color: 'var(--rm-text-muted)' }}>
            No gates
          </span>
        )}
      </SummaryCard>

      {/* Card 6: Runs */}
      <SummaryCard title="Runs in Window">
        <span className="text-[20px] font-semibold" style={{ color: 'var(--rm-text)' }}>
          {es.run_count}
        </span>
      </SummaryCard>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--rm-bg-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="mb-2"
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--rm-text-muted)',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
