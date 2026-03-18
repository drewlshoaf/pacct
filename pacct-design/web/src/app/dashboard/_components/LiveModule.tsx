'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { LivePlanRun, PlanRunListItem } from '@/data/types';
import { fetchPlanRunsList } from '@/lib/api';

const DISMISSED_KEY = 'rm-dashboard-dismissed-runs';

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(ids: Set<string>) {
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids])); } catch {}
}

function Elapsed({ since }: { since: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!since) return <span style={{ color: 'var(--rm-text-muted)' }}>—</span>;
  const elapsed = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const h = Math.floor(m / 60);
  const display = h > 0 ? `${h}h ${m % 60}m ${s}s` : `${m}m ${String(s).padStart(2, '0')}s`;

  return <span className="font-mono text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>{display}</span>;
}

function formatStarted(started_at: string | null): string {
  if (!started_at) return '—';
  return new Date(started_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatProgress(completed: number, total: number): string {
  if (total === 0) return '0% · 0/0';
  const pct = Math.round((completed / total) * 100);
  return `${pct}% · ${completed}/${total}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--rm-pass-muted)', color: 'var(--rm-pass)' }}>
        Completed
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(211,93,93,0.08)', color: 'var(--rm-fail)' }}>
        Failed
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(167,176,192,0.06)', color: 'var(--rm-text-muted)' }}>
      {status}
    </span>
  );
}

function RecentRunsPanel() {
  const [runs, setRuns] = useState<PlanRunListItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await fetchPlanRunsList({ limit: 10, offset: 0 });
    setRuns(result.plan_runs);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  const visible = runs.filter(r => !dismissed.has(r.id)).slice(0, 5);

  if (loading) {
    return (
      <div className="card text-center py-8">
        <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>Loading recent runs...</p>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>No recent runs.</p>
        <Link href="/dashboard/analytics" className="text-[12px] font-semibold no-underline hover:underline mt-2 inline-block" style={{ color: 'var(--rm-signal)' }}>
          View analytics &rarr;
        </Link>
      </div>
    );
  }

  return (
    <>
      <div style={{ border: '1px solid var(--rm-border)' }} className="rounded-lg overflow-hidden">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--rm-bg-raised)', borderBottom: '1px solid var(--rm-border)' }}>
              <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Name</th>
              <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Triggered</th>
              <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Duration</th>
              <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Status</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(run => (
              <tr key={run.id} style={{ borderBottom: '1px solid var(--rm-border)' }} className="transition-colors hover:bg-[var(--rm-bg-raised)]">
                <td className="px-4 py-3 font-semibold">
                  <Link
                    href={`/dashboard/analytics?plan_id=${run.id}`}
                    className="no-underline hover:underline"
                    style={{ color: 'var(--rm-signal)' }}
                  >
                    {run.plan_name.replace(/ \(Auto\)$/, '')}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--rm-text-secondary)' }}>
                  {timeAgo(run.created_at)}
                </td>
                <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: 'var(--rm-text-muted)' }}>
                  {formatDuration(run.duration_seconds)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={run.status} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => dismiss(run.id)}
                    className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-hover)]"
                    title="Dismiss"
                    style={{ color: 'var(--rm-text-muted)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-right">
        <Link href="/dashboard/analytics" className="text-[12px] font-semibold no-underline hover:underline" style={{ color: 'var(--rm-signal)' }}>
          View analytics &rarr;
        </Link>
      </div>
    </>
  );
}

export default function LiveModule({ data, hasMore }: { data: LivePlanRun[]; hasMore: boolean }) {
  return (
    <>
      {data.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--rm-pass)' }} />
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>LIVE</h2>
          </div>
          <div style={{ border: '1px solid var(--rm-border)' }} className="rounded-lg overflow-hidden">
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--rm-bg-raised)', borderBottom: '1px solid var(--rm-border)' }}>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Started</th>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Elapsed</th>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Environment</th>
                  <th className="text-left px-4 py-2.5 font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {data.map(run => (
                  <tr key={run.id} style={{ borderBottom: '1px solid var(--rm-border)' }} className="transition-colors hover:bg-[var(--rm-bg-raised)]">
                    <td className="px-4 py-3 font-semibold">
                      <Link
                        href={`/dashboard/live?planRunId=${run.id}`}
                        className="no-underline hover:underline"
                        style={{ color: 'var(--rm-signal)' }}
                      >
                        {run.plan_name.replace(/ \(Auto\)$/, '')}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--rm-text-secondary)' }}>
                      {formatStarted(run.started_at)}
                    </td>
                    <td className="px-4 py-3"><Elapsed since={run.started_at} /></td>
                    <td className="px-4 py-3" style={{ color: 'var(--rm-text-secondary)' }}>
                      {run.environment_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--rm-text)' }}>
                      {formatProgress(run.completed_scenarios, run.total_scenarios)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="mt-2 text-right">
              <Link
                href="/dashboard/live"
                className="text-[12px] font-semibold no-underline hover:underline"
                style={{ color: 'var(--rm-signal)' }}
              >
                View all live runs &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Recent Runs</h2>
        </div>
        <RecentRunsPanel />
      </div>
    </>
  );
}
