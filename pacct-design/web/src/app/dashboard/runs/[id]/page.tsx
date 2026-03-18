'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PortalLayout from '@/components/layout/PortalLayout';
import { fetchPlanRunDetail } from '@/lib/api';
import type { PlanRunDetail, PlanRunScenarioDetail } from '@/data/types';

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    completed: { bg: 'var(--rm-pass-muted)', color: 'var(--rm-pass)' },
    failed: { bg: 'rgba(211,93,93,0.08)', color: 'var(--rm-fail)' },
    running: { bg: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' },
    queued: { bg: 'rgba(167,176,192,0.06)', color: 'var(--rm-text-muted)' },
    pending: { bg: 'rgba(167,176,192,0.06)', color: 'var(--rm-text-muted)' },
  };
  const s = styles[status] ?? styles.queued;
  return (
    <span className="text-[11px] px-2 py-0.5 rounded font-medium capitalize" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function ScenarioCard({ scenario, onClick }: { scenario: PlanRunScenarioDetail; onClick: () => void }) {
  const clickable = !!scenario.run_id;
  const scoreColor = scenario.score != null
    ? scenario.score >= 80 ? 'var(--rm-pass)' : scenario.score >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)'
    : 'var(--rm-text-muted)';

  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`rounded-xl p-4 transition-all ${clickable ? 'cursor-pointer hover:border-[var(--rm-signal)]' : ''}`}
      style={{
        background: 'var(--rm-bg-surface)',
        border: '1px solid var(--rm-border)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}>
              #{scenario.index + 1}
            </span>
            <StatusBadge status={scenario.status} />
          </div>
          <h3 className="text-[14px] font-medium truncate" style={{ color: 'var(--rm-text)' }}>
            {scenario.scenario_name || 'Unnamed Scenario'}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {scenario.score != null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>Score</p>
            <p className="text-[18px] font-bold tabular-nums" style={{ color: scoreColor }}>{scenario.score}</p>
          </div>
        )}
        {scenario.duration_seconds != null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>Duration</p>
            <p className="text-[14px] font-medium tabular-nums" style={{ color: 'var(--rm-text-secondary)' }}>{formatDuration(scenario.duration_seconds)}</p>
          </div>
        )}
      </div>

      {scenario.error && (
        <p className="text-[11px] mt-2 px-2 py-1 rounded" style={{ background: 'rgba(211,93,93,0.06)', color: 'var(--rm-fail)' }}>
          {scenario.error}
        </p>
      )}

      {clickable && (
        <p className="text-[11px] mt-3 flex items-center gap-1" style={{ color: 'var(--rm-signal)' }}>
          View details
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </p>
      )}
    </div>
  );
}

export default function PlanRunOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const planRunId = params.id as string;

  const [detail, setDetail] = useState<PlanRunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanRunDetail(planRunId).then(d => {
      setDetail(d);
      setLoading(false);

      // For single-scenario completed plans, auto-redirect to scenario detail
      if (d && d.total_scenarios === 1 && d.scenarios.length === 1 && d.scenarios[0].run_id) {
        router.replace(`/dashboard/runs/${planRunId}/scenarios/${d.scenarios[0].run_id}`);
      }
    });
  }, [planRunId, router]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!detail) {
    return (
      <PortalLayout>
        <div className="card text-center py-12">
          <p className="text-[16px] mb-4" style={{ color: 'var(--rm-text-secondary)' }}>Run not found</p>
          <Link href="/dashboard/analytics" className="btn btn-primary">Back to Analytics</Link>
        </div>
      </PortalLayout>
    );
  }

  const planName = detail.plan_name.replace(/ \(Auto\)$/, '');

  // Duration = wall-clock span across all scenarios (first start → last end),
  // falling back to plan-run timestamps, then sum of individual durations
  const scenarioStarts = detail.scenarios.map(s => s.started_at).filter(Boolean) as string[];
  const scenarioEnds = detail.scenarios.map(s => s.completed_at).filter(Boolean) as string[];
  const firstStart = scenarioStarts.length > 0 ? Math.min(...scenarioStarts.map(t => new Date(t).getTime())) : null;
  const lastEnd = scenarioEnds.length > 0 ? Math.max(...scenarioEnds.map(t => new Date(t).getTime())) : null;
  const totalDuration = firstStart != null && lastEnd != null
    ? Math.round((lastEnd - firstStart) / 1000)
    : detail.started_at && detail.completed_at
      ? Math.round((new Date(detail.completed_at).getTime() - new Date(detail.started_at).getTime()) / 1000)
      : detail.scenarios.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) || null;

  // Compute aggregate score
  const scores = detail.scenarios.filter(s => s.score != null).map(s => s.score!);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/analytics" className="text-[13px] transition-colors hover:underline" style={{ color: 'var(--rm-text-muted)' }}>
              Analytics
            </Link>
            <span style={{ color: 'var(--rm-text-muted)' }}>/</span>
          </div>
          <h1 className="text-[20px] font-semibold" style={{ color: 'var(--rm-text)' }}>{planName}</h1>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
            {detail.id.slice(0, 8)} · {detail.triggered_by}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge status={detail.status} />
          {detail.status === 'running' && (
            <Link
              href={`/dashboard/runs/${planRunId}/monitor`}
              className="btn btn-primary text-[13px]"
            >
              Live Monitor
            </Link>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { label: 'Scenarios', value: `${detail.completed_scenarios + detail.failed_scenarios}/${detail.total_scenarios}` },
          { label: 'Score', value: avgScore != null ? String(avgScore) : '—', color: avgScore != null ? (avgScore >= 80 ? 'var(--rm-pass)' : avgScore >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)') : undefined },
          { label: 'Duration', value: totalDuration != null ? formatDuration(totalDuration) : '—' },
          { label: 'Started', value: detail.created_at ? new Date(detail.created_at).toLocaleString() : '—' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 min-w-[120px] px-3 py-2 text-center rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>{label}</p>
            <p className="text-[16px] font-bold tabular-nums" style={{ color: color ?? 'var(--rm-text)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Scenario cards */}
      <h2 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--rm-text)' }}>
        Scenarios ({detail.scenarios.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {detail.scenarios.map(scenario => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onClick={() => {
              if (scenario.run_id) {
                router.push(`/dashboard/runs/${planRunId}/scenarios/${scenario.run_id}`);
              }
            }}
          />
        ))}
      </div>
    </PortalLayout>
  );
}
