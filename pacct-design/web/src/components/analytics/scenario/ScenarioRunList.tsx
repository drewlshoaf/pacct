'use client';

import type { ScenarioSummary } from '@/lib/api';

export default function ScenarioRunList({
  data,
  selectedRunId,
  onSelectRun,
}: {
  data: ScenarioSummary;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
}) {
  const runs = data.run_list;

  if (runs.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>No runs in this window.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--rm-text)' }}>Runs</h3>
      <div className="space-y-1">
        {runs.map((run, i) => {
          const isSelected = run.run_id === selectedRunId;
          const isFailed = run.status === 'failed' || run.error != null;
          const displayStatus = isFailed ? 'Failed' : 'Completed';

          return (
            <div
              key={run.run_id ?? i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
              style={{
                background: isSelected ? 'var(--rm-signal-glow)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--rm-border-hover)' : 'transparent'}`,
              }}
              onClick={() => run.run_id && onSelectRun(run.run_id)}
            >
              <span className="text-[12px] w-[100px] flex-shrink-0" style={{ color: 'var(--rm-text-muted)' }}>
                {run.date
                  ? new Date(run.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md" style={{ background: 'var(--rm-bg-raised)', color: isFailed ? 'var(--rm-fail)' : 'var(--rm-text-muted)' }}>
                {displayStatus}
              </span>
              <span className="text-[12px] ml-auto" style={{ color: 'var(--rm-text-muted)' }}>
                {run.stability != null ? `${run.stability}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
