'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { fetchPlanDetail, runPlan, pausePlan, resumePlan, deletePlanById } from '@/lib/api';
import type { PlanDetailResponse, PlanScenarioInfo } from '@/lib/api';
import type { Plan, PlanRun, PlanSchedule } from '@loadtoad/schema';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function describeSchedule(schedule: PlanSchedule): string {
  const time = schedule.time ?? '';
  const tz = schedule.timezone ? ` ${schedule.timezone}` : '';
  switch (schedule.type) {
    case 'manual': return 'Manual \u2014 run on demand';
    case 'on_deploy': return 'Triggered on deploy';
    case 'once': {
      if (!schedule.scheduled_at) return 'Once (not scheduled)';
      const d = new Date(schedule.scheduled_at);
      return `Once on ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${time || d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${tz}`;
    }
    case 'daily': {
      if (schedule.days && schedule.days.length > 0 && schedule.days.length < 7) {
        const names = schedule.days.map(d => DAY_LABELS[d]).join(', ');
        return `${names} at ${time || '06:00'}${tz}`;
      }
      return `Daily at ${time || '06:00'}${tz}`;
    }
    case 'weekly': {
      const day = schedule.days?.[0] ?? 6;
      return `Weekly on ${DAY_LABELS[day]} at ${time || '06:00'}${tz}`;
    }
    case 'monthly': return `Monthly at ${time || '06:00'}${tz}`;
    case 'quarterly': return `Quarterly at ${time || '06:00'}${tz}`;
    case 'cron': return `Cron: ${schedule.expression}`;
    default: return schedule.expression || 'Unknown';
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: 'var(--rm-pass-muted)', color: 'var(--rm-pass)' }}>Active</span>;
  }
  return <span className="text-[11px] px-2 py-0.5 rounded font-semibold" style={{ background: 'rgba(167,176,192,0.06)', color: 'var(--rm-text-muted)' }}>Paused</span>;
}

function RunStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    completed: { bg: 'var(--rm-pass-muted)', fg: 'var(--rm-pass)' },
    failed: { bg: 'rgba(211,93,93,0.08)', fg: 'var(--rm-fail)' },
    running: { bg: 'var(--rm-signal-glow)', fg: 'var(--rm-signal)' },
    queued: { bg: 'rgba(167,176,192,0.06)', fg: 'var(--rm-text-muted)' },
    cancelled: { bg: 'rgba(167,176,192,0.06)', fg: 'var(--rm-text-muted)' },
  };
  const c = colors[status] ?? colors.queued;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: c.bg, color: c.fg }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [data, setData] = useState<PlanDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchPlanDetail(planId);
    if (result) {
      setData(result);
    } else {
      setError(true);
    }
    setLoading(false);
  }, [planId]);

  useEffect(() => { load(); }, [load]);

  const handleRunNow = async () => {
    setActionLoading(true);
    const result = await runPlan(planId);
    setActionLoading(false);
    if (result) load();
  };

  const handleTogglePause = async () => {
    if (!data) return;
    setActionLoading(true);
    if (data.plan.status === 'active') {
      await pausePlan(planId);
    } else {
      await resumePlan(planId);
    }
    setActionLoading(false);
    load();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const ok = await deletePlanById(planId);
    setDeleting(false);
    if (ok) router.push('/dashboard/plans');
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-muted)' }}>Loading...</p>
        </div>
      </PortalLayout>
    );
  }

  if (error || !data) {
    return (
      <PortalLayout>
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-fail)' }}>Plan not found.</p>
          <Link href="/dashboard/plans" className="btn btn-ghost text-[13px] mt-3">Back to Plans</Link>
        </div>
      </PortalLayout>
    );
  }

  const { plan, recent_runs, scenarios } = data;

  const cardStyle = {
    background: 'var(--rm-bg-surface)',
    border: '1px solid var(--rm-border)',
    borderRadius: 12,
    padding: '16px 20px',
    marginBottom: 16,
  };

  const actions = (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRunNow}
        disabled={actionLoading}
        className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
        style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)', opacity: actionLoading ? 0.5 : 1 }}
      >
        Run Now
      </button>
      <button
        onClick={handleTogglePause}
        disabled={actionLoading}
        className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
        style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)', border: '1px solid var(--rm-border)' }}
      >
        {plan.status === 'active' ? 'Pause' : 'Resume'}
      </button>
      <Link
        href={`/dashboard/plans/${planId}/edit`}
        className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors no-underline"
        style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)', border: '1px solid var(--rm-border)' }}
      >
        Edit
      </Link>
      <button
        onClick={() => setShowDeleteModal(true)}
        className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
        style={{ color: 'var(--rm-fail)', border: '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}
      >
        Delete
      </button>
    </div>
  );

  return (
    <PortalLayout>
      <PageHeader
        title={plan.name}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={plan.status} />
            {actions}
          </div>
        }
      />

      {/* Overview */}
      <div style={cardStyle}>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--rm-text-muted)' }}>Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] block" style={{ color: 'var(--rm-text-muted)' }}>Status</span>
            <StatusBadge status={plan.status} />
          </div>
          <div>
            <span className="text-[10px] block" style={{ color: 'var(--rm-text-muted)' }}>Scenarios</span>
            <span className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>{plan.scenario_ids.length}</span>
          </div>
          <div>
            <span className="text-[10px] block" style={{ color: 'var(--rm-text-muted)' }}>Created</span>
            <span className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>{timeAgo(plan.created_at)}</span>
          </div>
          <div>
            <span className="text-[10px] block" style={{ color: 'var(--rm-text-muted)' }}>Updated</span>
            <span className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>{timeAgo(plan.updated_at)}</span>
          </div>
        </div>
        {plan.description && (
          <p className="text-[12px] mt-3 pt-3" style={{ color: 'var(--rm-text-secondary)', borderTop: '1px solid var(--rm-border)' }}>
            {plan.description}
          </p>
        )}
      </div>

      {/* Schedule */}
      <div style={cardStyle}>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--rm-text-muted)' }}>Schedule</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>
            {(plan.schedule?.type ?? 'manual').toUpperCase()}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--rm-text)' }}>
            {describeSchedule(plan.schedule ?? { type: 'manual', expression: 'Manual' })}
          </span>
        </div>
      </div>

      {/* Scenarios */}
      <div style={cardStyle}>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--rm-text-muted)' }}>Scenarios</h3>
        {scenarios.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>No scenarios in this plan.</p>
        ) : (
          <div className="space-y-1">
            {scenarios.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[var(--rm-bg-raised)]">
                {s.exists ? (
                  <Link
                    href={`/dashboard/scenarios/${s.id}/edit`}
                    className="text-[12px] font-medium no-underline flex-1 min-w-0 truncate"
                    style={{ color: 'var(--rm-text)' }}
                  >
                    {s.name}
                  </Link>
                ) : (
                  <span className="text-[12px] font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--rm-text-muted)' }}>
                    {s.name}
                    <span className="text-[10px] ml-2" style={{ color: 'var(--rm-fail)' }}>Missing</span>
                  </span>
                )}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-text-muted)' }}>
                  {(s.type ?? 'rest').toUpperCase()}
                </span>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--rm-text-muted)' }}>
                  {s.step_count} step{s.step_count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run History */}
      <div style={cardStyle}>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--rm-text-muted)' }}>Run History</h3>
        {recent_runs.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--rm-border)' }}>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Date</th>
                  <th className="text-center px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Status</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Triggered By</th>
                  <th className="text-center px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Scenarios</th>
                  <th className="text-right px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {recent_runs.map(run => {
                  const duration = run.started_at && run.completed_at
                    ? Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)
                    : null;
                  return (
                    <tr
                      key={run.id}
                      className="cursor-pointer transition-colors hover:bg-[var(--rm-bg-raised)]"
                      style={{ borderTop: '1px solid var(--rm-border)' }}
                      onClick={() => router.push(`/dashboard/analytics?plan_id=${run.id}`)}
                    >
                      <td className="px-3 py-2" style={{ color: 'var(--rm-text-secondary)' }}>
                        {run.created_at ? new Date(run.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <RunStatusBadge status={run.status} />
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--rm-text-muted)' }}>
                        {run.triggered_by}
                      </td>
                      <td className="px-3 py-2 text-center" style={{ color: 'var(--rm-text-secondary)' }}>
                        {run.completed_scenarios}/{run.total_scenarios}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
                        {duration != null ? formatDuration(duration) : '\u2014'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="card" style={{ padding: 24, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Delete Plan</h3>
            <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-secondary)' }}>
              Delete <strong>{plan.name}</strong>? This will remove the plan and its schedule. Existing run history will not be affected.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} className="btn btn-ghost text-[13px] px-4 py-2">Cancel</button>
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
