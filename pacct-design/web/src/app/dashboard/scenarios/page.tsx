'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { STEP_TYPE_LABELS, STEP_TYPE_COLORS } from './types';
import type { Scenario, StepType } from './types';
import { useScenarios, deleteScenarioFromServer, deleteScenario, saveScenarioToServer, saveScenario } from './_store/scenarioStore';
import RunButton from '@/components/run/RunButton';
import DuplicateTargetWarning from '@/components/run/DuplicateTargetWarning';
import RmSelect from '@/components/ui/RmSelect';
import { startRun, startBulkRun } from '@/lib/run-api';

const PAGE_SIZE = 10;

const tagColors: Record<string, string> = {
  'revenue-critical': 'var(--rm-fail)',
  'security-critical': 'var(--rm-fail)',
  'multi-step': 'var(--rm-signal)',
  'onboarding': 'var(--rm-signal)',
  'read-heavy': 'var(--rm-pass)',
  'search-index': 'var(--rm-caution)',
  'high-frequency': 'var(--rm-caution)',
  'external-dependency': 'var(--rm-caution)',
  'db-intensive': 'var(--rm-caution)',
  'concurrency-sensitive': 'var(--rm-fail)',
  'real-time': 'var(--rm-pass)',
  'async': 'var(--rm-signal)',
  'message-queue': 'var(--rm-text-muted)',
};

type SortKey = 'name' | 'type' | 'steps' | 'duration' | 'gates' | 'last_run' | 'updated';
type SortDir = 'asc' | 'desc';

function getPrimaryStepType(s: Scenario): StepType {
  return s.steps?.[0]?.config.step_type ?? 'rest';
}

function getScenarioDuration(s: Scenario): number {
  const lp = s.load_profile;
  if (!lp) return 0;
  const rampUp = lp.ramp_up?.duration_seconds ?? 0;
  const rampDown = lp.ramp_down?.duration_seconds ?? 0;
  let testSec = 0;
  const dur = lp.duration;
  if (dur?.type === 'fixed' && dur.fixed) {
    testSec = dur.fixed.seconds;
  } else if (dur?.type === 'iterations' && dur.iterations) {
    testSec = dur.iterations.max_duration_seconds;
  } else if (lp.pattern?.type === 'step' && lp.pattern.step) {
    testSec = lp.pattern.step.step_count * lp.pattern.step.step_duration_seconds;
  } else if (lp.pattern?.type === 'custom' && lp.pattern.custom?.stages) {
    testSec = lp.pattern.custom.stages.reduce((sum, st) => sum + st.duration_seconds, 0);
  }
  return rampUp + testSec + rampDown;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
}

function getPrimaryDetail(step: Scenario['steps'][number]): string {
  switch (step.config.step_type) {
    case 'rest': return step.config.rest?.path ?? '';
    case 'graphql': return step.config.graphql?.endpoint ?? '/graphql';
    case 'browser': return step.config.browser?.url ?? '';
    default: return '';
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1 inline-block">
      <path d="M5 1L8.5 4.5H1.5L5 1Z" fill={active && dir === 'asc' ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={active && dir === 'asc' ? 1 : 0.3} />
      <path d="M5 9L1.5 5.5H8.5L5 9Z" fill={active && dir === 'desc' ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={active && dir === 'desc' ? 1 : 0.3} />
    </svg>
  );
}

function Pagination({ safePage, totalPages, totalItems, onPageChange, className }: {
  safePage: number; totalPages: number; totalItems: number;
  onPageChange: (p: number) => void; className?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between ${className ?? ''}`}>
      <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
        Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalItems)} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={safePage === 1} className="btn btn-ghost text-[12px] px-2 py-1 disabled:opacity-30" title="First page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 17l-5-5 5-5" /><path d="M18 17l-5-5 5-5" /></svg>
        </button>
        <button onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} className="btn btn-ghost text-[12px] px-2 py-1 disabled:opacity-30" title="Previous page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) { pageNum = i + 1; }
          else if (safePage < 4) { pageNum = i + 1; }
          else if (safePage > totalPages - 3) { pageNum = totalPages - 4 + i; }
          else { pageNum = safePage - 2 + i; }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className="text-[12px] w-7 h-7 rounded-md transition-colors"
              style={{
                background: safePage === pageNum ? 'var(--rm-signal-glow)' : 'transparent',
                color: safePage === pageNum ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
                fontWeight: safePage === pageNum ? 600 : 400,
              }}
            >
              {pageNum}
            </button>
          );
        })}
        <button onClick={() => onPageChange(safePage + 1)} disabled={safePage === totalPages} className="btn btn-ghost text-[12px] px-2 py-1 disabled:opacity-30" title="Next page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={safePage === totalPages} className="btn btn-ghost text-[12px] px-2 py-1 disabled:opacity-30" title="Last page">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 17l5-5-5-5" /><path d="M6 17l5-5-5-5" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function ScenariosPage() {
  const scenarios = useScenarios();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkRunWarning, setShowBulkRunWarning] = useState(false);
  const [bulkRunWarningUrl, setBulkRunWarningUrl] = useState('');
  const [bulkRunWarningCount, setBulkRunWarningCount] = useState(0);
  const [pendingBulkRunIds, setPendingBulkRunIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<StepType | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [lastRuns, setLastRuns] = useState<Record<string, string>>({});
  const [gateCounts, setGateCounts] = useState<Record<string, number>>({});

  // Fetch last run timestamps and gate counts
  useEffect(() => {
    fetch('/api/scenarios/last-runs')
      .then(r => r.ok ? r.json() : {})
      .then(data => setLastRuns(data))
      .catch(() => {});
    fetch('/api/scenarios/gate-counts')
      .then(r => r.ok ? r.json() : {})
      .then(data => setGateCounts(data))
      .catch(() => {});
  }, []);

  // Collect unique tags for filter dropdown
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    scenarios.forEach(s => s.metadata.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [scenarios]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'updated' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  // Filter → Sort → Paginate
  const processed = useMemo(() => {
    let list = [...scenarios];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.metadata.name.toLowerCase().includes(q)
        || s.metadata.description.toLowerCase().includes(q)
        || s.metadata.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      list = list.filter(s => getPrimaryStepType(s) === typeFilter);
    }

    // Tag filter
    if (tagFilter !== 'all') {
      list = list.filter(s => s.metadata.tags.includes(tagFilter));
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.metadata.name.localeCompare(b.metadata.name);
          break;
        case 'type':
          cmp = getPrimaryStepType(a).localeCompare(getPrimaryStepType(b));
          break;
        case 'last_run': {
          const aTime = lastRuns[a.metadata.id] ? new Date(lastRuns[a.metadata.id]).getTime() : 0;
          const bTime = lastRuns[b.metadata.id] ? new Date(lastRuns[b.metadata.id]).getTime() : 0;
          cmp = aTime - bTime;
          break;
        }
        case 'steps':
          cmp = a.steps.length - b.steps.length;
          break;
        case 'duration':
          cmp = getScenarioDuration(a) - getScenarioDuration(b);
          break;
        case 'gates':
          cmp = (gateCounts[a.metadata.id] ?? 0) - (gateCounts[b.metadata.id] ?? 0);
          break;
        case 'updated':
          cmp = new Date(a.metadata.updated_at).getTime() - new Date(b.metadata.updated_at).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [scenarios, search, typeFilter, tagFilter, sortKey, sortDir, lastRuns, gateCounts]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteScenarioFromServer(id);
    } catch {
      deleteScenario(id);
    }
    setDeleting(null);
  };

  const handleClone = async (e: React.MouseEvent, scenario: Scenario) => {
    e.preventDefault();
    e.stopPropagation();
    setCloning(scenario.metadata.id);
    const now = new Date().toISOString();
    const cloned: Scenario = {
      ...structuredClone(scenario),
      metadata: {
        ...scenario.metadata,
        id: crypto.randomUUID(),
        name: `${scenario.metadata.name} (Copy)`,
        created_at: now,
        updated_at: now,
      },
    };
    try {
      await saveScenarioToServer(cloned);
    } catch {
      saveScenario(cloned);
    }
    setCloning(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pagedIds = paged.map(s => s.metadata.id);
  const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pagedIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = [...selectedIds];
    await Promise.all(ids.map(async (id) => {
      try { await deleteScenarioFromServer(id); } catch { deleteScenario(id); }
    }));
    setBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
    setSelectedIds(new Set());
  };

  const executeBulkRun = async (ids: string[]) => {
    setBulkRunning(true);
    try {
      const result = await startBulkRun(ids);
      setSelectedIds(new Set());
      setShowBulkRunWarning(false);
      setPendingBulkRunIds([]);
      // Navigate to live view with the plan_run_id so all scenarios are visible
      window.location.href = `/dashboard/live?plan_run_id=${result.plan_run_id}`;
    } catch {
      setBulkRunning(false);
      setShowBulkRunWarning(false);
      setPendingBulkRunIds([]);
    }
  };

  const handleBulkRun = async () => {
    const ids = [...selectedIds];

    // Collect base_urls of selected scenarios
    const selectedUrls = ids.map(id => {
      const s = scenarios.find(sc => sc.metadata.id === id);
      return s?.metadata.base_url ?? '';
    }).filter(Boolean);

    // Also check against currently active runs
    let activeUrls: string[] = [];
    try {
      const res = await fetch('/api/runs/active-targets');
      if (res.ok) {
        const data = await res.json() as { base_urls: string[] };
        activeUrls = data.base_urls;
      }
    } catch { /* proceed without active check */ }

    // Combine and find duplicates
    const allUrls = [...selectedUrls, ...activeUrls];
    const urlCounts = new Map<string, number>();
    for (const url of allUrls) {
      urlCounts.set(url, (urlCounts.get(url) ?? 0) + 1);
    }

    const duplicateUrl = [...urlCounts.entries()].find(([, count]) => count > 1);
    if (duplicateUrl) {
      setBulkRunWarningUrl(duplicateUrl[0]);
      setBulkRunWarningCount(duplicateUrl[1]);
      setPendingBulkRunIds(ids);
      setShowBulkRunWarning(true);
      return;
    }

    await executeBulkRun(ids);
  };

  const thStyle = { color: 'var(--rm-text-secondary)', cursor: 'pointer' } as const;

  return (
    <PortalLayout>
      <PageHeader title="Scenarios" description="Reusable user journeys and API flows" actions={<Link href="/dashboard/scenarios/new" className="btn btn-primary text-[13px]">Create Scenario</Link>} />

      {scenarios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--rm-text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>No scenarios yet</p>
          <p className="text-[13px] mb-4">Create your first scenario to get started.</p>
          <Link href="/dashboard/scenarios/new" className="btn btn-primary text-[13px]">Create Scenario</Link>
        </div>
      ) : (
        <>
          {/* Toolbar: search + filters */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search scenarios..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
              />
            </div>
            <RmSelect
              value={typeFilter}
              onChange={v => { setTypeFilter(v as StepType | 'all'); setPage(1); }}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'rest', label: 'REST' },
                { value: 'graphql', label: 'GraphQL' },
                { value: 'browser', label: 'Browser' },
              ]}
              size="sm"
            />
            {allTags.length > 0 && (
              <RmSelect
                value={tagFilter}
                onChange={v => { setTagFilter(v); setPage(1); }}
                options={[
                  { value: 'all', label: 'All Tags' },
                  ...allTags.map(t => ({ value: t, label: t })),
                ]}
                size="sm"
                searchable
                menuMinWidth="240px"
              />
            )}
            {selectedIds.size > 0 && (
              <>
                <span className="text-[12px] px-2 py-1 rounded-lg font-medium" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  disabled={bulkDeleting}
                  className="text-[12px] px-3 py-1 rounded-md font-medium transition-colors"
                  style={{ background: 'var(--rm-fail)', color: '#fff', opacity: bulkDeleting ? 0.5 : 1 }}
                >
                  {bulkDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={handleBulkRun}
                  disabled={bulkRunning}
                  className="text-[12px] px-3 py-1 rounded-md font-medium transition-colors"
                  style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)', opacity: bulkRunning ? 0.5 : 1 }}
                >
                  {bulkRunning ? 'Starting...' : 'Run'}
                </button>
              </>
            )}
            <span className="text-[12px] ml-auto" style={{ color: 'var(--rm-text-muted)' }}>
              {processed.length} scenario{processed.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Top Pagination */}
          <Pagination safePage={safePage} totalPages={totalPages} totalItems={processed.length} onPageChange={setPage} className="mb-3" />

          {/* Table */}
          <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--rm-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--rm-bg-raised)' }}>
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="cursor-pointer accent-[var(--rm-signal)]"
                      />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('name')}>
                      Name <SortIcon active={sortKey === 'name'} dir={sortDir} />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('type')}>
                      Type <SortIcon active={sortKey === 'type'} dir={sortDir} />
                    </th>
                    <th className="text-center px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('steps')}>
                      Steps <SortIcon active={sortKey === 'steps'} dir={sortDir} />
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('duration')}>
                      Duration <SortIcon active={sortKey === 'duration'} dir={sortDir} />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>
                      Tags
                    </th>
                    <th className="text-center px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('gates')}>
                      Gates <SortIcon active={sortKey === 'gates'} dir={sortDir} />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('last_run')}>
                      Last Run <SortIcon active={sortKey === 'last_run'} dir={sortDir} />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('updated')}>
                      Updated <SortIcon active={sortKey === 'updated'} dir={sortDir} />
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right" style={{ color: 'var(--rm-text-secondary)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center" style={{ color: 'var(--rm-text-muted)' }}>
                        No scenarios match your filters.
                      </td>
                    </tr>
                  ) : paged.map((scenario) => {
                    const id = scenario.metadata.id;
                    const stepType = getPrimaryStepType(scenario);
                    const primaryStep = scenario.steps?.[0];
                    const detail = primaryStep ? getPrimaryDetail(primaryStep) : '';
                    const lastRunAt = lastRuns[id];

                    return (
                      <tr
                        key={id}
                        className="cursor-pointer transition-colors"
                        style={{ borderTop: '1px solid var(--rm-border)' }}
                        onClick={() => window.location.href = `/dashboard/scenarios/${id}/edit`}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(id)}
                            onChange={() => toggleSelect(id)}
                            className="cursor-pointer accent-[var(--rm-signal)]"
                          />
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          <div className="text-[13px] font-medium truncate" style={{ color: 'var(--rm-text)' }}>{scenario.metadata.name}</div>
                          {scenario.metadata.description && (
                            <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{scenario.metadata.description}</div>
                          )}
                          {detail && (
                            <div className="text-[10px] font-mono truncate mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{detail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--rm-signal-glow)', color: STEP_TYPE_COLORS[stepType] }}>
                            {STEP_TYPE_LABELS[stepType]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: 'var(--rm-text-secondary)' }}>
                          {scenario.steps.length}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
                          {formatDuration(getScenarioDuration(scenario))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {scenario.metadata.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--rm-signal-glow)', color: tagColors[tag] || 'var(--rm-text-muted)' }}>{tag}</span>
                            ))}
                            {scenario.metadata.tags.length > 3 && (
                              <span className="text-[9px] px-1 py-0.5" style={{ color: 'var(--rm-text-muted)' }}>+{scenario.metadata.tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: 'var(--rm-text-secondary)' }}>
                          {gateCounts[id] ?? 0}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--rm-text-muted)' }}>
                          {lastRunAt ? new Date(lastRunAt).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--rm-text-muted)' }}>
                          {timeAgo(scenario.metadata.updated_at)}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Link
                              href={`/dashboard/scenarios/${id}/runs`}
                              className="text-[10px] px-2 py-1 rounded-md font-medium no-underline transition-colors"
                              style={{ background: 'var(--rm-border)', color: 'var(--rm-text-secondary)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-border-hover)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--rm-border)'; }}
                            >
                              Runs
                            </Link>
                            <button
                              onClick={(e) => handleClone(e, scenario)}
                              disabled={cloning === id}
                              className="p-1 rounded transition-colors"
                              title="Clone"
                              style={{ opacity: cloning === id ? 0.4 : 1 }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-signal-glow)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, id, scenario.metadata.name)}
                              disabled={deleting === id}
                              className="p-1 rounded hover:bg-red-500/10"
                              title="Delete"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={deleting === id ? 'var(--rm-text-muted)' : 'var(--rm-fail)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                            <RunButton scenarioId={id} scenarioBaseUrl={scenario.metadata.base_url} size="sm" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Pagination */}
          <Pagination safePage={safePage} totalPages={totalPages} totalItems={processed.length} onPageChange={setPage} className="mt-4" />
        </>
      )}
      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Delete {selectedIds.size} scenario{selectedIds.size !== 1 ? 's' : ''}?</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>This action cannot be undone.</p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)', border: '1px solid var(--rm-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
                style={{ background: 'var(--rm-fail)', color: '#fff', opacity: bulkDeleting ? 0.5 : 1 }}
              >
                {bulkDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Run Duplicate Target Warning */}
      {showBulkRunWarning && (
        <DuplicateTargetWarning
          duplicateUrl={bulkRunWarningUrl}
          count={bulkRunWarningCount}
          onContinue={() => executeBulkRun(pendingBulkRunIds)}
          onCancel={() => { setShowBulkRunWarning(false); setPendingBulkRunIds([]); }}
          loading={bulkRunning}
        />
      )}
    </PortalLayout>
  );
}
