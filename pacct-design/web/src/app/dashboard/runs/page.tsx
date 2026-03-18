'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { fetchPlanRunsList, deletePlanRunById } from '@/lib/api';
import type { FetchPlanRunsListParams } from '@/lib/api';
import type { PlanRunListItem, PlanRunScenarioSummary } from '@/data/types';
import RmSelect from '@/components/ui/RmSelect';

const PAGE_SIZE = 10;

type SortKey = 'date' | 'name' | 'status' | 'score' | 'duration';
type SortDir = 'asc' | 'desc';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return { date, time };
}

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span style={{ color: 'var(--rm-text-muted)' }}>—</span>;
  const color = score >= 80 ? 'var(--rm-pass)' : score >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)';
  return <span className="font-medium" style={{ color }}>{score}</span>;
}

function PlanStatusBadge({ status, completed, total, failed }: { status: string; completed: number; total: number; failed: number }) {
  if (status === 'completed') {
    return (
      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--rm-pass-muted)', color: 'var(--rm-pass)' }}>
        Completed
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(211,93,93,0.08)', color: 'var(--rm-fail)' }}>
        Failed{failed > 0 ? ` (${failed})` : ''}
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>
        Running {completed}/{total}
      </span>
    );
  }
  if (status === 'queued') {
    return (
      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(167,176,192,0.06)', color: 'var(--rm-text-muted)' }}>
        Queued
      </span>
    );
  }
  return (
    <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(167,176,192,0.06)', color: 'var(--rm-text-muted)' }}>
      {status}
    </span>
  );
}

function ScenarioStatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === 'failed') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (status === 'running') {
    return <span className="w-2.5 h-2.5 rounded-full animate-pulse inline-block flex-shrink-0" style={{ background: 'var(--rm-signal)' }} />;
  }
  return <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: 'var(--rm-text-muted)', opacity: 0.4 }} />;
}

function ScenarioRow({ scenario, planRunId }: { scenario: PlanRunScenarioSummary; planRunId: string }) {
  const router = useRouter();
  const scoreColor = scenario.score != null
    ? scenario.score >= 80 ? 'var(--rm-pass)' : scenario.score >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)'
    : undefined;
  const clickable = !!scenario.run_id;

  return (
    <div
      className={`flex items-center gap-3 px-5 py-2 text-[12px] transition-colors${clickable ? ' cursor-pointer hover:bg-[var(--rm-bg-hover)]' : ''}`}
      onClick={clickable ? (e) => {
        e.stopPropagation();
        router.push(`/dashboard/runs/${planRunId}/scenarios/${scenario.run_id}`);
      } : undefined}
    >
      <ScenarioStatusIcon status={scenario.status} />
      <span className="flex-1 min-w-0 truncate" style={{ color: clickable ? 'var(--rm-text)' : 'var(--rm-text-secondary)' }}>
        {scenario.name}
      </span>
      {scenario.score != null && (
        <span className="font-mono text-[11px] font-medium w-[32px] text-right" style={{ color: scoreColor }}>
          {scenario.score}
        </span>
      )}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1 inline-block">
      <path d="M5 1L8.5 4.5H1.5L5 1Z" fill={active && dir === 'asc' ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={active && dir === 'asc' ? 1 : 0.3} />
      <path d="M5 9L1.5 5.5H8.5L5 9Z" fill={active && dir === 'desc' ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={active && dir === 'desc' ? 1 : 0.3} />
    </svg>
  );
}

function PlanRunCard({ run, displayName, onDelete, onClick, selected, onToggleSelect }: {
  run: PlanRunListItem;
  displayName: string;
  onDelete: () => void;
  onClick: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const { date, time } = formatDate(run.created_at);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${selected ? 'var(--rm-border-hover)' : 'var(--rm-border)'}`, background: selected ? 'var(--rm-signal-glow)' : undefined }}
    >
      {/* Run header */}
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--rm-bg-raised)]"
        onClick={onClick}
      >
        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="cursor-pointer accent-[var(--rm-signal)]"
          />
        </div>
        <div className="w-[110px] flex-shrink-0">
          <span className="text-[13px] block" style={{ color: 'var(--rm-text-secondary)' }}>{date}</span>
          <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>{time}</span>
        </div>
        <span className="text-[13px] font-semibold flex-1 min-w-0 truncate" style={{ color: 'var(--rm-text)' }}>
          {displayName}
        </span>
        <PlanStatusBadge
          status={run.status}
          completed={run.completed_scenarios}
          total={run.total_scenarios}
          failed={run.failed_scenarios}
        />
        <span className="w-[50px] text-center"><ScoreCell score={run.aggregate_score} /></span>
        <span className="w-[70px] text-[13px] text-right" style={{ color: 'var(--rm-text-muted)' }}>
          {run.duration_seconds != null ? formatDuration(run.duration_seconds) : '—'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded-md transition-colors hover:bg-[var(--rm-bg-hover)] flex-shrink-0"
          title="Delete run"
          style={{ color: 'var(--rm-text-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
          </svg>
        </button>
      </div>

      {/* Scenario ladder */}
      {run.scenarios && run.scenarios.length > 0 && (
        <div style={{ borderTop: '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}>
          {run.scenarios.map((s, i) => (
            <div key={i} style={{ borderTop: i > 0 ? '1px solid var(--rm-border)' : undefined }}>
              <ScenarioRow scenario={s} planRunId={run.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RunsPage() {
  const router = useRouter();

  // Redirect to Analytics — Runs is no longer a primary entry point
  useEffect(() => {
    router.replace('/dashboard/analytics');
  }, [router]);

  const [runs, setRuns] = useState<PlanRunListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<PlanRunListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [statusFilter]);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    const params: FetchPlanRunsListParams = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter !== 'all') params.status = statusFilter;
    const result = await fetchPlanRunsList(params);
    setRuns(result.plan_runs);
    setTotal(result.total);
    setLoading(false);
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Client-side sort (server returns by created_at desc; we re-sort if user picks another column)
  const sortedRuns = [...runs].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'date':
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'name':
        cmp = displayName(a).localeCompare(displayName(b));
        break;
      case 'status':
        cmp = a.status.localeCompare(b.status);
        break;
      case 'score':
        cmp = (a.aggregate_score ?? -1) - (b.aggregate_score ?? -1);
        break;
      case 'duration':
        cmp = (a.duration_seconds ?? -1) - (b.duration_seconds ?? -1);
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!debouncedSearch || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setPage(0);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pageRunIds = runs.map(r => r.id);
  const allPageSelected = pageRunIds.length > 0 && pageRunIds.every(id => selectedIds.has(id));
  const somePageSelected = pageRunIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRunIds.forEach(id => next.delete(id));
      } else {
        pageRunIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleting(true);
    const ok = await deletePlanRunById(targetId);
    setDeleting(false);
    setDeleteTarget(null);
    if (ok) {
      setRuns(prev => prev.filter(r => r.id !== targetId));
      setTotal(prev => Math.max(0, prev - 1));
      loadRuns();
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    await Promise.all(ids.map(id => deletePlanRunById(id)));
    setBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
    setSelectedIds(new Set());
    loadRuns();
  };

  /** Display name: for single-scenario auto-plans show the scenario name */
  function displayName(run: PlanRunListItem) {
    return run.plan_name.replace(/ \(Auto\)$/, '');
  }

  // Pagination helpers
  const showFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showTo = Math.min((page + 1) * PAGE_SIZE, total);

  const pageWindowSize = 5;
  const halfWin = Math.floor(pageWindowSize / 2);
  let winStart = Math.max(0, page - halfWin);
  const winEnd = Math.min(totalPages - 1, winStart + pageWindowSize - 1);
  if (winEnd - winStart + 1 < pageWindowSize) winStart = Math.max(0, winEnd - pageWindowSize + 1);
  const pageNumbers = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i);

  return (
    <PortalLayout>
      <PageHeader title="Runs" description="All scenario executions" />

      {/* Toolbar + Paging — at top */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="checkbox"
            checked={allPageSelected}
            ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
            onChange={toggleSelectAll}
            className="cursor-pointer accent-[var(--rm-signal)]"
            disabled={runs.length === 0}
          />
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--rm-text-muted)' }}
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search runs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13 }}
            />
          </div>

          {/* Status filter */}
          <RmSelect
            value={statusFilter}
            onChange={v => setStatusFilter(v)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
              { value: 'running', label: 'Running' },
              { value: 'queued', label: 'Queued' },
            ]}
            size="sm"
          />

          {/* Sort */}
          <RmSelect
            value={`${sortKey}-${sortDir}`}
            onChange={v => {
              const [k, d] = v.split('-') as [SortKey, SortDir];
              setSortKey(k);
              setSortDir(d);
            }}
            options={[
              { value: 'date-desc', label: 'Newest First' },
              { value: 'date-asc', label: 'Oldest First' },
              { value: 'name-asc', label: 'Name A\u2013Z' },
              { value: 'name-desc', label: 'Name Z\u2013A' },
              { value: 'score-desc', label: 'Highest Score' },
              { value: 'score-asc', label: 'Lowest Score' },
              { value: 'duration-desc', label: 'Longest Duration' },
              { value: 'duration-asc', label: 'Shortest Duration' },
            ]}
            size="sm"
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[12px] px-2.5 py-1.5 rounded-md transition-colors"
              style={{ color: 'var(--rm-text-secondary)', background: 'var(--rm-bg-raised)' }}
            >
              Clear filters
            </button>
          )}

          {selectedIds.size > 0 && (
            <>
              <span className="text-[12px] px-2 py-1 rounded-lg font-medium" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="text-[12px] px-3 py-1 rounded-md font-medium transition-colors"
                style={{ background: 'var(--rm-fail)', color: '#fff' }}
              >
                Delete
              </button>
            </>
          )}
          <span className="text-[12px] ml-auto" style={{ color: 'var(--rm-text-muted)' }}>
            {total} run{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Pagination — inside toolbar at top */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--rm-border)' }}>
            <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
              Showing {showFrom}–{showTo} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                title="First page"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 9L1 6L4 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                title="Previous page"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {pageNumbers.map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-[11px] font-medium transition-colors"
                  style={{
                    background: n === page ? 'var(--rm-signal)' : 'var(--rm-bg-raised)',
                    color: n === page ? '#fff' : 'var(--rm-text-muted)',
                    border: n === page ? '1px solid var(--rm-signal)' : '1px solid var(--rm-border)',
                  }}
                >
                  {n + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                title="Next page"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                title="Last page"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 3L11 6L8 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Run cards */}
      {loading && runs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-muted)' }}>Loading...</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[14px] mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
            {hasFilters ? 'No runs match your filters' : 'No runs found'}
          </p>
          <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
            {hasFilters ? 'Try adjusting your search.' : 'Run a load test to see results here.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn btn-ghost text-[12px] mt-2">Clear filters</button>
          )}
        </div>
      ) : (
        <div className="space-y-3" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          {sortedRuns.map(run => (
            <PlanRunCard
              key={run.id}
              run={run}
              displayName={displayName(run)}
              onDelete={() => setDeleteTarget(run)}
              onClick={() => router.push(`/dashboard/runs/${run.id}`)}
              selected={selectedIds.has(run.id)}
              onToggleSelect={() => toggleSelect(run.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 400, width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>
              Delete Run
            </h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-secondary)' }}>
              Delete <strong>{displayName(deleteTarget)}</strong>? This will permanently remove all scenarios, metrics, and analysis data.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn btn-ghost text-[13px] px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[13px] px-4 py-2 rounded-md font-medium transition-colors"
                style={{ background: 'var(--rm-fail)', color: '#fff', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {showBulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => !bulkDeleting && setShowBulkDeleteConfirm(false)}
        >
          <div
            className="card"
            style={{ padding: 24, maxWidth: 400, width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>
              Delete {selectedIds.size} Run{selectedIds.size !== 1 ? 's' : ''}
            </h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-secondary)' }}>
              This will permanently remove {selectedIds.size} run{selectedIds.size !== 1 ? 's' : ''} and all associated scenarios, metrics, and analysis data.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={bulkDeleting}
                className="btn btn-ghost text-[13px] px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="text-[13px] px-4 py-2 rounded-md font-medium transition-colors"
                style={{ background: 'var(--rm-fail)', color: '#fff', opacity: bulkDeleting ? 0.6 : 1 }}
              >
                {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Run${selectedIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
