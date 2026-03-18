'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { QueueStats } from '@/hooks/useInfraStream';
import RmSelect from '@/components/ui/RmSelect';

// ─── Types & Constants ──────────────────────────────────────────────────────

type QueueName = 'run-execute' | 'run-segment' | 'plan-execute';
type JobState = 'waiting' | 'active' | 'completed' | 'failed';

interface JobSummary {
  id: string;
  state: string;
  run_id: string | null;
  scenario_name: string | null;
  phase: string | null;
  message: string | null;
  error: string | null;
  created_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
}

const QUEUE_TABS: { value: QueueName; label: string }[] = [
  { value: 'run-execute', label: 'Run' },
  { value: 'run-segment', label: 'Segment' },
  { value: 'plan-execute', label: 'Execution' },
];

const STATE_TABS: JobState[] = ['waiting', 'active', 'completed', 'failed'];

const STATE_COLORS: Record<JobState, string> = {
  waiting: 'var(--rm-caution)',
  active: 'var(--rm-pass)',
  completed: 'var(--rm-signal)',
  failed: 'var(--rm-fail)',
};

const PAGE_SIZES = [20, 50, 100] as const;

// ─── Utilities ──────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

// ─── Queue Browser View ─────────────────────────────────────────────────────

interface QueueBrowserViewProps {
  stats: QueueStats | null;
}

export default function QueueBrowserView({ stats }: QueueBrowserViewProps) {
  const [queue, setQueue] = useState<QueueName>('run-execute');
  const [state, setState] = useState<JobState>('failed');
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Counts from SSE stream for badge display
  const getCounts = useCallback((): Record<JobState, number> => {
    if (!stats) return { waiting: 0, active: 0, completed: 0, failed: 0 };
    const q = queue === 'run-execute' ? stats.run : queue === 'run-segment' ? stats.segment : stats.run;
    return { waiting: q.waiting, active: q.active, completed: q.completed, failed: q.failed };
  }, [stats, queue]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/queues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, state, limit: pageSize, offset }),
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setTotal(data.total);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [queue, state, offset, pageSize]);

  // Fetch when queue/state/offset/pageSize changes
  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Auto-refresh when SSE counts change
  const countsKey = stats ? `${stats.run.waiting}-${stats.run.active}-${stats.run.completed}-${stats.run.failed}-${stats.segment.waiting}-${stats.segment.active}` : '';
  useEffect(() => {
    if (countsKey) fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey]);

  // Clear selection when filters change
  useEffect(() => { setSelected(new Set()); }, [queue, state, offset, pageSize]);

  const handleFlush = async () => {
    const counts = getCounts();
    const count = counts[state];
    if (!confirm(`Flush ${count} ${state} jobs from ${queue}? This cannot be undone.`)) return;
    setFlushing(true);
    try {
      await fetch('/api/admin/queues', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, state }),
      });
      setOffset(0);
      setSelected(new Set());
      await fetchJobs();
    } catch { /* ignore */ }
    setFlushing(false);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm(`Delete job ${jobId}?`)) return;
    try {
      await fetch('/api/admin/queues', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, state, job_id: jobId }),
      });
      setSelected(prev => { const next = new Set(prev); next.delete(jobId); return next; });
      await fetchJobs();
    } catch { /* ignore */ }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await fetch('/api/admin/queues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, job_id: jobId }),
      });
      await fetchJobs();
    } catch { /* ignore */ }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    if (!confirm(`Delete ${ids.length} selected job${ids.length !== 1 ? 's' : ''}?`)) return;
    setBulkBusy(true);
    try {
      await fetch('/api/admin/queues', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, state, job_ids: ids }),
      });
      setSelected(new Set());
      await fetchJobs();
    } catch { /* ignore */ }
    setBulkBusy(false);
  };

  const handleBulkRetry = async () => {
    const ids = Array.from(selected);
    setBulkBusy(true);
    try {
      await fetch('/api/admin/queues', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue, job_ids: ids }),
      });
      setSelected(new Set());
      await fetchJobs();
    } catch { /* ignore */ }
    setBulkBusy(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === jobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(jobs.map(j => j.id)));
    }
  };

  const counts = getCounts();
  const canFlush = state !== 'active' && counts[state] > 0;
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;
  const hasSelection = selected.size > 0;
  const allSelected = jobs.length > 0 && selected.size === jobs.length;

  // Build page number buttons with ellipsis
  const pageNumbers = (() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  })();

  const goToPage = (page: number) => setOffset((page - 1) * pageSize);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Queue Browser</h3>
        <div className="flex items-center gap-2">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Show</span>
            <RmSelect
              value={String(pageSize)}
              onChange={v => { setPageSize(Number(v)); setOffset(0); }}
              options={PAGE_SIZES.map(s => ({ value: String(s), label: String(s) }))}
              size="sm"
            />
          </div>
          {canFlush && (
            <button
              onClick={handleFlush}
              disabled={flushing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(211,93,93,0.12)', color: 'var(--rm-fail)', cursor: flushing ? 'wait' : 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {flushing ? 'Flushing...' : `Flush ${counts[state]} ${state}`}
            </button>
          )}
        </div>
      </div>

      {/* Queue selector tabs */}
      <div className="flex gap-1 mb-3">
        {QUEUE_TABS.map(q => (
          <button key={q.value} onClick={() => { setQueue(q.value); setOffset(0); setExpandedId(null); }}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-all"
            style={{
              background: queue === q.value ? 'var(--rm-signal-glow)' : 'transparent',
              color: queue === q.value ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
            }}>
            {q.label}
          </button>
        ))}
      </div>

      {/* State filter tabs */}
      <div className="flex gap-1 mb-4">
        {STATE_TABS.map(s => (
          <button key={s} onClick={() => { setState(s); setOffset(0); setExpandedId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all"
            style={{
              background: state === s ? 'var(--rm-bg-raised)' : 'transparent',
              color: state === s ? STATE_COLORS[s] : 'var(--rm-text-muted)',
            }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: state === s ? 'var(--rm-bg-surface)' : 'transparent', color: counts[s] > 0 ? STATE_COLORS[s] : 'var(--rm-text-muted)' }}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--rm-signal-glow)', border: '1px solid var(--rm-signal-muted)' }}>
          <span className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {state === 'failed' && (
              <button
                onClick={handleBulkRetry}
                disabled={bulkBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                style={{ background: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)', cursor: bulkBusy ? 'wait' : 'pointer' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Retry selected
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              disabled={bulkBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
              style={{ background: 'rgba(211,93,93,0.12)', color: 'var(--rm-fail)', cursor: bulkBusy ? 'wait' : 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium transition-all"
              style={{ color: 'var(--rm-text-muted)' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Job table */}
      <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--rm-border)' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: 'var(--rm-bg-raised)' }}>
              {state !== 'active' && (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer accent-current"
                    style={{ accentColor: 'var(--rm-signal)' }}
                  />
                </th>
              )}
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Job</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Run</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Scenario</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Phase</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Info</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Age</th>
              <th className="w-20 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && jobs.length === 0 ? (
              <tr>
                <td colSpan={state !== 'active' ? 8 : 7} className="px-3 py-8 text-center" style={{ color: 'var(--rm-text-muted)' }}>Loading...</td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={state !== 'active' ? 8 : 7} className="px-3 py-8 text-center" style={{ color: 'var(--rm-text-muted)' }}>No {state} jobs in {queue}</td>
              </tr>
            ) : (
              jobs.map(job => (
                <React.Fragment key={job.id}>
                  <tr className="cursor-pointer transition-colors"
                    style={{
                      borderTop: '1px solid var(--rm-border)',
                      background: selected.has(job.id) ? 'var(--rm-signal-glow)' : 'transparent',
                    }}
                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                    onMouseEnter={e => { if (!selected.has(job.id)) e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = selected.has(job.id) ? 'var(--rm-signal-glow)' : 'transparent'; }}>
                    {state !== 'active' && (
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(job.id)}
                          onChange={() => toggleSelect(job.id)}
                          className="rounded cursor-pointer"
                          style={{ accentColor: 'var(--rm-signal)' }}
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--rm-text-secondary)' }}>#{job.id}</td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--rm-text-muted)' }}>
                      {job.run_id ? job.run_id.slice(0, 8) : '—'}
                    </td>
                    <td className="px-3 py-2 max-w-[160px] truncate" style={{ color: 'var(--rm-text)' }}>
                      {job.scenario_name || '—'}
                    </td>
                    <td className="px-3 py-2">
                      {job.phase ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--rm-bg-raised)', color: STATE_COLORS[state] }}>
                          {job.phase}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate" style={{ color: job.error ? 'var(--rm-fail)' : 'var(--rm-text-muted)' }}>
                      {job.error || job.message || '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--rm-text-muted)' }}>
                      {job.created_at ? timeAgo(job.created_at) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {state === 'failed' && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            className="p-1 rounded hover:bg-blue-500/10 transition-colors"
                            title="Retry job"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                          </button>
                        )}
                        {state !== 'active' && (
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1 rounded hover:bg-red-500/10 transition-colors"
                            title="Delete job"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === job.id && (
                    <tr style={{ borderTop: '1px solid var(--rm-border)' }}>
                      <td colSpan={state !== 'active' ? 8 : 7} className="px-3 py-3" style={{ background: 'var(--rm-bg-raised)' }}>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
                          <div><span style={{ color: 'var(--rm-text-muted)' }}>Job ID:</span> <span className="font-mono" style={{ color: 'var(--rm-text)' }}>#{job.id}</span></div>
                          <div><span style={{ color: 'var(--rm-text-muted)' }}>Run ID:</span> <span className="font-mono" style={{ color: 'var(--rm-text)' }}>{job.run_id || '—'}</span></div>
                          <div><span style={{ color: 'var(--rm-text-muted)' }}>Created:</span> <span style={{ color: 'var(--rm-text)' }}>{job.created_at ? new Date(job.created_at).toLocaleString() : '—'}</span></div>
                          <div><span style={{ color: 'var(--rm-text-muted)' }}>Finished:</span> <span style={{ color: 'var(--rm-text)' }}>{job.finished_at ? new Date(job.finished_at).toLocaleString() : '—'}</span></div>
                          <div><span style={{ color: 'var(--rm-text-muted)' }}>Duration:</span> <span style={{ color: 'var(--rm-text)' }}>{job.duration_ms != null ? fmtDuration(job.duration_ms) : '—'}</span></div>
                          <div><span style={{ color: 'var(--rm-text-muted)' }}>Phase:</span> <span style={{ color: 'var(--rm-text)' }}>{job.phase || '—'}</span></div>
                          {job.error && (
                            <div className="col-span-2">
                              <span style={{ color: 'var(--rm-text-muted)' }}>Error:</span>
                              <pre className="mt-1 px-2 py-1.5 rounded text-[10px] font-mono whitespace-pre-wrap" style={{ background: 'var(--rm-bg-void)', color: 'var(--rm-fail)' }}>{job.error}</pre>
                            </div>
                          )}
                          {job.message && (
                            <div className="col-span-2">
                              <span style={{ color: 'var(--rm-text-muted)' }}>Message:</span> <span style={{ color: 'var(--rm-text)' }}>{job.message}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            {total} job{total !== 1 ? 's' : ''} — page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            {/* First */}
            <button onClick={() => goToPage(1)} disabled={currentPage === 1}
              className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
              style={{ background: currentPage > 1 ? 'var(--rm-bg-raised)' : 'transparent', color: currentPage > 1 ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: currentPage > 1 ? 'pointer' : 'default' }}>
              &#171;
            </button>
            {/* Prev */}
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
              className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
              style={{ background: currentPage > 1 ? 'var(--rm-bg-raised)' : 'transparent', color: currentPage > 1 ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: currentPage > 1 ? 'pointer' : 'default' }}>
              &#8249;
            </button>
            {/* Page numbers */}
            {pageNumbers.map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`e${i}`} className="px-1.5 text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>…</span>
              ) : (
                <button key={p} onClick={() => goToPage(p)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                  style={{
                    background: p === currentPage ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                    color: p === currentPage ? 'var(--rm-signal)' : 'var(--rm-text-secondary)',
                    cursor: 'pointer',
                    fontWeight: p === currentPage ? 700 : 500,
                  }}>
                  {p}
                </button>
              )
            )}
            {/* Next */}
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
              className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
              style={{ background: currentPage < totalPages ? 'var(--rm-bg-raised)' : 'transparent', color: currentPage < totalPages ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: currentPage < totalPages ? 'pointer' : 'default' }}>
              &#8250;
            </button>
            {/* Last */}
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
              className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
              style={{ background: currentPage < totalPages ? 'var(--rm-bg-raised)' : 'transparent', color: currentPage < totalPages ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: currentPage < totalPages ? 'pointer' : 'default' }}>
              &#187;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
