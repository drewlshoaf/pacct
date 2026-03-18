'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { fetchPlans, deletePlanById, runPlan, pausePlan, resumePlan } from '@/lib/api';
import type { PlanListItem, FetchPlansParams } from '@/lib/api';
import type { PlanSchedule, PlanScheduleType } from '@loadtoad/schema';
import RmSelect from '@/components/ui/RmSelect';

const PAGE_SIZE = 10;

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

function describeSchedule(schedule: PlanSchedule): string {
  const time = schedule.time ?? '';
  const tz = schedule.timezone ? ` ${schedule.timezone}` : '';
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  switch (schedule.type) {
    case 'manual':
      return 'Manual';
    case 'on_deploy':
      return 'On deploy';
    case 'once': {
      if (!schedule.scheduled_at) return 'Once (not scheduled)';
      const d = new Date(schedule.scheduled_at);
      return `Once on ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${time || d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${tz}`;
    }
    case 'daily': {
      if (schedule.days && schedule.days.length > 0 && schedule.days.length < 7) {
        const names = schedule.days.map(d => dayNames[d]).join(', ');
        return `${names} at ${time || '06:00'}${tz}`;
      }
      return `Daily at ${time || '06:00'}${tz}`;
    }
    case 'weekly': {
      const day = schedule.days?.[0] ?? 6;
      return `Weekly on ${dayNames[day]} at ${time || '06:00'}${tz}`;
    }
    case 'monthly':
      return `Monthly at ${time || '06:00'}${tz}`;
    case 'quarterly':
      return `Quarterly at ${time || '06:00'}${tz}`;
    case 'cron':
      return `Cron: ${schedule.expression}`;
    default:
      return schedule.expression || 'Unknown';
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'var(--rm-pass-muted)', color: 'var(--rm-pass)' }}>
        Active
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(167,176,192,0.06)', color: 'var(--rm-text-muted)' }}>
      Paused
    </span>
  );
}

function LastRunStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: 'var(--rm-text-muted)' }}>Never</span>;
  const colors: Record<string, { bg: string; fg: string }> = {
    completed: { bg: 'var(--rm-pass-muted)', fg: 'var(--rm-pass)' },
    failed: { bg: 'rgba(211,93,93,0.08)', fg: 'var(--rm-fail)' },
    running: { bg: 'var(--rm-signal-glow)', fg: 'var(--rm-signal)' },
    queued: { bg: 'rgba(167,176,192,0.06)', fg: 'var(--rm-text-muted)' },
  };
  const c = colors[status] ?? colors.queued;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: c.bg, color: c.fg }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlanListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(0); }, [statusFilter, scheduleFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const params: FetchPlansParams = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (scheduleFilter !== 'all') params.scheduleType = scheduleFilter;
    const result = await fetchPlans(params);
    setPlans(result.plans);
    setTotal(result.total);
    setLoading(false);
  }, [page, debouncedSearch, statusFilter, scheduleFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!debouncedSearch || statusFilter !== 'all' || scheduleFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setScheduleFilter('all');
    setPage(0);
  };

  const handleRunNow = async (plan: PlanListItem) => {
    setActionLoading(plan.id);
    const result = await runPlan(plan.id);
    setActionLoading(null);
    if (result) load();
  };

  const handleTogglePause = async (plan: PlanListItem) => {
    setActionLoading(plan.id);
    if (plan.status === 'active') {
      await pausePlan(plan.id);
    } else {
      await resumePlan(plan.id);
    }
    setActionLoading(null);
    load();
  };

  const handleClone = async (plan: PlanListItem) => {
    // Navigate to create page with clone params
    router.push(`/dashboard/plans/new?clone=${plan.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deletePlanById(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    load();
  };

  // Pagination window
  const pageWindowSize = 5;
  const halfWin = Math.floor(pageWindowSize / 2);
  let winStart = Math.max(0, page - halfWin);
  const winEnd = Math.min(totalPages - 1, winStart + pageWindowSize - 1);
  if (winEnd - winStart + 1 < pageWindowSize) winStart = Math.max(0, winEnd - pageWindowSize + 1);
  const pageNumbers = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i);

  return (
    <PortalLayout>
      <PageHeader
        title="Plans"
        description="Schedule and orchestrate scenario groups"
        actions={
          <Link href="/dashboard/plans/new" className="btn btn-primary text-[13px]">
            Create Plan
          </Link>
        }
      />

      {/* Toolbar */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
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
              placeholder="Search plans..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ paddingLeft: 36, paddingTop: 8, paddingBottom: 8, fontSize: 13 }}
            />
          </div>

          <RmSelect
            value={statusFilter}
            onChange={v => setStatusFilter(v)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
            ]}
            size="sm"
          />

          <RmSelect
            value={scheduleFilter}
            onChange={v => setScheduleFilter(v)}
            options={[
              { value: 'all', label: 'All Schedules' },
              { value: 'manual', label: 'Manual' },
              { value: 'once', label: 'Once' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'cron', label: 'Cron' },
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

          <span className="text-[12px] ml-auto" style={{ color: 'var(--rm-text-muted)' }}>
            {total} plan{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--rm-border)' }}>
            <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
              Showing {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(0)} disabled={page === 0} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 9L1 6L4 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 9L4.5 6L7.5 3" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {pageNumbers.map(n => (
                <button key={n} onClick={() => setPage(n)} className="w-7 h-7 flex items-center justify-center rounded-md text-[11px] font-medium transition-colors" style={{ background: n === page ? 'var(--rm-signal)' : 'var(--rm-bg-raised)', color: n === page ? '#fff' : 'var(--rm-text-muted)', border: n === page ? '1px solid var(--rm-signal)' : '1px solid var(--rm-border)' }}>
                  {n + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-30" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 3L11 6L8 9" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {loading && plans.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-muted)' }}>Loading...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--rm-text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
            {hasFilters ? 'No plans match your filters' : 'No plans yet'}
          </p>
          <p className="text-[13px] mb-4">
            {hasFilters ? 'Try adjusting your search.' : 'Create a plan to group scenarios and schedule runs.'}
          </p>
          {hasFilters ? (
            <button onClick={clearFilters} className="btn btn-ghost text-[12px]">Clear filters</button>
          ) : (
            <Link href="/dashboard/plans/new" className="btn btn-primary text-[13px]">Create Plan</Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--rm-border)', opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ background: 'var(--rm-bg-raised)' }}>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Name</th>
                  <th className="text-center px-4 py-2.5 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Status</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Schedule</th>
                  <th className="text-center px-4 py-2.5 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Scenarios</th>
                  <th className="text-center px-4 py-2.5 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Gates</th>
                  <th className="text-left px-4 py-2.5 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Last Run</th>
                  <th className="px-4 py-2.5 font-medium text-right" style={{ color: 'var(--rm-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map(plan => (
                  <tr
                    key={plan.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderTop: '1px solid var(--rm-border)' }}
                    onClick={() => router.push(`/dashboard/plans/${plan.id}`)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-3 max-w-[320px]">
                      <div className="text-[13px] font-medium truncate" style={{ color: 'var(--rm-text)' }}>{plan.name}</div>
                      {plan.description && (
                        <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{plan.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={plan.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--rm-text-secondary)' }}>
                      <span className="text-[11px]">{describeSchedule(plan.schedule)}</span>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--rm-text-secondary)' }}>
                      {plan.scenario_count}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--rm-text-secondary)' }}>
                      <div className="flex items-center justify-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        {plan.gate_ids?.length ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-2">
                        {plan.last_run_at ? (
                          <>
                            <span style={{ color: 'var(--rm-text-muted)' }}>{timeAgo(plan.last_run_at)}</span>
                            <LastRunStatusBadge status={plan.last_run_status} />
                          </>
                        ) : (
                          <span style={{ color: 'var(--rm-text-muted)' }}>Never</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleRunNow(plan)}
                          disabled={actionLoading === plan.id}
                          className="text-[10px] px-2 py-1 rounded-md font-medium no-underline transition-colors"
                          style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)', opacity: actionLoading === plan.id ? 0.5 : 1 }}
                          title="Run now"
                        >
                          Run
                        </button>
                        <button
                          onClick={() => handleTogglePause(plan)}
                          disabled={actionLoading === plan.id}
                          className="text-[10px] px-2 py-1 rounded-md font-medium transition-colors"
                          style={{ background: 'var(--rm-border)', color: 'var(--rm-text-secondary)' }}
                          title={plan.status === 'active' ? 'Pause' : 'Resume'}
                        >
                          {plan.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                        <button
                          onClick={() => handleClone(plan)}
                          className="p-1 rounded transition-colors"
                          title="Clone"
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-signal-glow)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/plans/${plan.id}/edit`)}
                          className="p-1 rounded transition-colors"
                          title="Edit"
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-signal-glow)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(plan)}
                          className="p-1 rounded hover:bg-red-500/10"
                          title="Delete"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="card" style={{ padding: 24, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Delete Plan</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-secondary)' }}>
              Delete <strong>{deleteTarget.name}</strong>? This will remove the plan and its schedule. Existing run history will not be affected.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="btn btn-ghost text-[13px] px-4 py-2">Cancel</button>
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
    </PortalLayout>
  );
}
