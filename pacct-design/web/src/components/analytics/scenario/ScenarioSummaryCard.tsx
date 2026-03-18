'use client';

import type { ScenarioSummary } from '@/lib/api';

export default function ScenarioSummaryCard({ data }: { data: ScenarioSummary }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>{data.scenario_name}</h3>
      </div>

      {data.assertions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {data.assertions.map(a => (
            <span
              key={a.metric}
              className="text-[11px] font-mono px-2 py-0.5 rounded"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)', border: '1px solid var(--rm-border)' }}
            >
              {a.metric === 'error_rate' ? 'error' : a.metric} {a.operator} {a.threshold}{a.unit}
            </span>
          ))}
        </div>
      )}

      <div className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>
        Latest: {data.latest_run_status}
      </div>
    </div>
  );
}
