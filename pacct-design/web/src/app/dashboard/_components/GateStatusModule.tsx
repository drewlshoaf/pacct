'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { DashboardGateResult, DashboardGateStatus, TimeWindow } from '@/data/types';
import RmSelect from '@/components/ui/RmSelect';

const PAGE_SIZE = 5;

type SortKey = 'status' | 'name' | 'entity' | 'evaluated';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER: Record<string, number> = { failed: 0, passed: 1, not_evaluated: 2 };

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

function StatusBadge({ status }: { status: string }) {
  const isFailed = status === 'failed';
  const isPassed = status === 'passed';
  const dotColor = isFailed ? 'var(--rm-fail)' : isPassed ? 'var(--rm-pass)' : 'var(--rm-text-muted)';
  const label = isFailed ? 'No Go' : isPassed ? 'Go' : 'Not Evaluated';
  const bg = isFailed
    ? 'color-mix(in srgb, var(--rm-fail) 10%, transparent)'
    : isPassed
      ? 'color-mix(in srgb, var(--rm-pass) 10%, transparent)'
      : 'color-mix(in srgb, var(--rm-text-muted) 8%, transparent)';

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: bg, color: dotColor }}>
      <span className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: dotColor }} />
      {label}
    </span>
  );
}

export default function GateStatusModule({ data, window = '24h' }: { data: DashboardGateStatus; window?: TimeWindow }) {
  // Only show scenario-linked gates
  const allGates = useMemo(() => (data.all_gates ?? []).filter(g => g.entity_type === 'scenario'), [data.all_gates]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('evaluated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'evaluated' ? 'desc' : 'asc'); }
    setPage(1);
  };

  // Filter → Sort → Paginate
  const filtered = useMemo(() => {
    let rows = allGates;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(g => g.gate_name.toLowerCase().includes(q) || (g.entity_name || '').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') rows = rows.filter(g => g.status === statusFilter);

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'status': cmp = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3); break;
        case 'name': cmp = a.gate_name.localeCompare(b.gate_name); break;
        case 'entity': cmp = (a.entity_name || a.entity_id).localeCompare(b.entity_name || b.entity_id); break;
        case 'evaluated': cmp = new Date(a.last_evaluated_at).getTime() - new Date(b.last_evaluated_at).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [allGates, search, statusFilter, sortKey, sortDir]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pagedRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // Summary
  const summaryParts: string[] = [];
  if (data.failed_count > 0) summaryParts.push(`${data.failed_count} no go`);
  if (data.passed_count > 0) summaryParts.push(`${data.passed_count} go`);
  const notEval = data.not_evaluated_count ?? 0;
  if (notEval > 0) summaryParts.push(`${notEval} not evaluated`);
  const windowLabel = window === '24h' ? '24h' : window === '7d' ? '7 days' : '30 days';

  // Pagination helpers
  const showFrom = totalFiltered === 0 ? 0 : startIdx + 1;
  const showTo = Math.min(startIdx + PAGE_SIZE, totalFiltered);

  const pageWindowSize = 5;
  const halfWin = Math.floor(pageWindowSize / 2);
  let winStart = Math.max(1, safePage - halfWin);
  const winEnd = Math.min(totalPages, winStart + pageWindowSize - 1);
  if (winEnd - winStart + 1 < pageWindowSize) winStart = Math.max(1, winEnd - pageWindowSize + 1);
  const pageNumbers = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i);

  const thClass = "text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap";

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Gate Map</h2>
        {allGates.length > 0 && (
          <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            {summaryParts.join(' · ')} in {windowLabel}
          </span>
        )}
      </div>

      {allGates.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>No gates configured.</p>
          <Link
            href="/dashboard/gates"
            className="text-[12px] no-underline mt-2 inline-block"
            style={{ color: 'var(--rm-signal)' }}
          >
            Create a gate
          </Link>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-3" style={{ position: 'relative', zIndex: 10 }}>
            <input
              type="text"
              placeholder="Search gates…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="h-8 px-3 rounded-lg text-[12px] outline-none flex-1 min-w-[180px] max-w-[280px]"
              style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
            />
            <RmSelect
              value={statusFilter}
              onChange={v => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'failed', label: 'No Go' },
                { value: 'passed', label: 'Go' },
                { value: 'not_evaluated', label: 'Not Evaluated' },
              ]}
              size="sm"
            />
            <span className="text-[11px] ml-auto" style={{ color: 'var(--rm-text-muted)' }}>
              {totalFiltered} gate{totalFiltered !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--rm-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: 'var(--rm-bg-raised)' }}>
                    <th className={thClass} style={{ color: 'var(--rm-text-secondary)', width: 120 }} onClick={() => toggleSort('status')}>
                      Status <SortIcon active={sortKey === 'status'} dir={sortDir} />
                    </th>
                    <th className={thClass} style={{ color: 'var(--rm-text-secondary)' }} onClick={() => toggleSort('name')}>
                      Gate Name <SortIcon active={sortKey === 'name'} dir={sortDir} />
                    </th>
                    <th className={thClass} style={{ color: 'var(--rm-text-secondary)' }} onClick={() => toggleSort('entity')}>
                      Scenario <SortIcon active={sortKey === 'entity'} dir={sortDir} />
                    </th>
                    <th className={thClass} style={{ color: 'var(--rm-text-secondary)', width: 140 }} onClick={() => toggleSort('evaluated')}>
                      Last Evaluated <SortIcon active={sortKey === 'evaluated'} dir={sortDir} />
                    </th>
                    <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-secondary)', width: 90 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
                        No gates match your filters.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map(gate => {
                      const isFailed = gate.status === 'failed';
                      const isPassed = gate.status === 'passed';
                      const rowBg = isFailed
                        ? 'color-mix(in srgb, var(--rm-fail) 4%, transparent)'
                        : isPassed
                          ? 'color-mix(in srgb, var(--rm-pass) 4%, transparent)'
                          : undefined;

                      return (
                        <tr
                          key={gate.gate_id}
                          className="transition-colors"
                          style={{ borderTop: '1px solid var(--rm-border)', background: rowBg }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--rm-signal) 4%, var(--rm-bg-raised))')}
                          onMouseLeave={e => (e.currentTarget.style.background = rowBg || '')}
                        >
                          <td className="px-3 py-2.5">
                            <StatusBadge status={gate.status} />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium" style={{ color: isFailed ? 'var(--rm-fail)' : 'var(--rm-text)' }}>
                              {gate.gate_name}
                            </div>
                            {isFailed && gate.failed_conditions.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {gate.failed_conditions.map((cond, j) => (
                                  <div key={j} className="text-[10px] font-mono truncate max-w-[340px]" style={{ color: 'var(--rm-fail)' }}>
                                    {cond}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/dashboard/analytics?scenario_id=${encodeURIComponent(gate.entity_id)}`}
                              className="no-underline hover:underline"
                              style={{ color: 'var(--rm-signal)' }}
                            >
                              {gate.entity_name || gate.entity_id}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5" style={{ color: 'var(--rm-text-muted)' }}>
                            {gate.status === 'not_evaluated'
                              ? 'Not evaluated'
                              : timeAgo(gate.last_evaluated_at)
                            }
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {isFailed ? (
                              <Link
                                href={`/dashboard/issues/${encodeURIComponent(`gate::${gate.gate_id}::gate_failed`)}?window=${window}`}
                                className="text-[11px] font-semibold no-underline"
                                style={{ color: 'var(--rm-signal)' }}
                              >
                                Investigate
                              </Link>
                            ) : (
                              <Link
                                href="/dashboard/gates"
                                className="text-[11px] no-underline"
                                style={{ color: 'var(--rm-text-muted)' }}
                              >
                                View
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
                Showing {showFrom}–{showTo} of {totalFiltered}
              </span>
              <div className="flex items-center gap-1">
                {/* First */}
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                  style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 9L1 6L4 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {/* Prev */}
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                  style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {/* Page numbers */}
                {pageNumbers.map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-[11px] font-medium transition-colors"
                    style={{
                      background: n === safePage ? 'var(--rm-signal)' : 'var(--rm-bg-raised)',
                      color: n === safePage ? '#fff' : 'var(--rm-text-muted)',
                      border: n === safePage ? '1px solid var(--rm-signal)' : '1px solid var(--rm-border)',
                    }}
                  >
                    {n}
                  </button>
                ))}
                {/* Next */}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                  style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                {/* Last */}
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30"
                  style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 3L11 6L8 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
