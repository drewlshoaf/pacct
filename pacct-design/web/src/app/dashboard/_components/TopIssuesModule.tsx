'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { IssueSignature, IssueSortMode, TimeWindow } from '@/data/types';

function IssueRow({ issue, window }: { issue: IssueSignature; window: TimeWindow }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ border: '1px solid var(--rm-border)' }} className="rounded-lg overflow-hidden">
      {/* Collapsed row */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--rm-bg-raised)]"
        onClick={() => setExpanded(!expanded)}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="mt-0.5 flex-shrink-0 transition-transform"
          style={{ color: 'var(--rm-text-muted)', transform: expanded ? 'rotate(90deg)' : undefined }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
              {issue.primary_line}
            </span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
              style={{
                background: issue.failure_type === 'gate_failed' ? 'var(--rm-fail)' : 'var(--rm-signal-glow)',
                color: issue.failure_type === 'gate_failed' ? '#fff' : 'var(--rm-signal)',
              }}
            >
              {issue.failure_type === 'gate_failed' ? 'Gate' : 'Run'}
            </span>
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
            {issue.failure_type === 'gate_failed'
              ? issue.occurrences[0]?.detail || 'Gate condition failed'
              : `Occurrences: ${issue.occurrence_count} · Runs: ${issue.plan_names.join(', ')}`
            }
          </div>
        </div>
        <Link
          href={`/dashboard/issues/${encodeURIComponent(issue.key)}?window=${window}`}
          className="text-[11px] font-semibold no-underline flex-shrink-0"
          style={{ color: 'var(--rm-signal)' }}
          onClick={e => e.stopPropagation()}
        >
          Investigate
        </Link>
      </div>

      {/* Expanded occurrences */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}>
          {issue.occurrences
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
            .map((occ, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 text-[12px]"
                style={{ borderTop: i > 0 ? '1px solid var(--rm-border)' : undefined }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span style={{ color: 'var(--rm-text-muted)' }}>
                    {new Date(occ.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="truncate" style={{ color: 'var(--rm-text-secondary)' }}>{occ.scenario_name}</span>
                </div>
                <Link
                  href={`/dashboard/analytics?plan_id=${occ.plan_run_id}`}
                  className="text-[11px] font-semibold no-underline flex-shrink-0"
                  style={{ color: 'var(--rm-signal)' }}
                >
                  Open
                </Link>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function TopIssuesModule({
  data,
  window = '24h',
}: {
  data: IssueSignature[];
  window?: TimeWindow;
}) {
  const [sortBy, setSortBy] = useState<IssueSortMode>('recent');

  // Sort
  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'severity') {
      const rank: Record<string, number> = { run_failed: 0, gate_failed: 0, error: 1, p95: 2, stability: 3 };
      return (rank[a.failure_type] ?? 4) - (rank[b.failure_type] ?? 4);
    }
    return b.most_recent_at.localeCompare(a.most_recent_at);
  });

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Most Pressing Issues</h2>
        <div className="flex gap-1">
          {(['recent', 'severity'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setSortBy(mode)}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors"
              style={{
                background: sortBy === mode ? 'var(--rm-signal-glow)' : 'transparent',
                color: sortBy === mode ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
              }}
            >
              {mode === 'recent' ? 'Recent' : 'Severity'}
            </button>
          ))}
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>No pressing issues in this time window.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(issue => <IssueRow key={issue.key} issue={issue} window={window} />)}
        </div>
      )}
    </div>
  );
}
