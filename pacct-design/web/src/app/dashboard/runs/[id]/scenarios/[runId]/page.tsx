'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PortalLayout from '@/components/layout/PortalLayout';
import PrimaryChart from '@/components/charts/PrimaryChart';
import EventTimeline from '@/components/charts/EventTimeline';
import AiPanel from '@/components/ai-panel/AiPanel';
import ComparisonModal from '@/components/comparison/ComparisonModal';
import { fetchRunDetail, fetchPlanRunDetail } from '@/lib/api';
import type { RunDetail, MetricPoint, PlanRunDetail } from '@/data/types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computeStatBubbles(metrics: MetricPoint[]) {
  if (metrics.length === 0) return { p95Rps: 0, p95Latency: 0, errorPct: 0, timeoutPct: 0 };
  const rpsSorted = metrics.map(m => m.throughput).sort((a, b) => a - b);
  const totalRequests = metrics.reduce((sum, m) => sum + m.throughput, 0);
  const totalErrors = metrics.reduce((sum, m) => sum + m.errorRate * m.throughput / 100, 0);
  const errorPct = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  const totalTimeouts = metrics.reduce((sum, m) => sum + (m.timeoutRate ?? 0) * m.throughput / 100, 0);
  const timeoutPct = totalRequests > 0 ? (totalTimeouts / totalRequests) * 100 : 0;
  const latencySorted = metrics.map(m => m.latencyP95).sort((a, b) => a - b);
  const p95Latency = percentile(latencySorted, 95);
  return { p95Rps: percentile(rpsSorted, 95), p95Latency, errorPct, timeoutPct };
}

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatPatternType(type?: string): string {
  if (!type) return 'Unknown';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const STEP_TYPE_LABELS: Record<string, string> = {
  rest: 'REST / HTTP',
  graphql: 'GraphQL',
  browser: 'Web Page',
};

const POLICY_MODE_LABELS: Record<string, string> = {
  SCOUT: 'Scout',
  FORENSICS: 'Forensics',
};

export default function ScenarioDetailPage() {
  const params = useParams();
  const planRunId = params.id as string;
  const runId = params.runId as string;

  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [planRun, setPlanRun] = useState<PlanRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const [showComp, setShowComp] = useState(false);
  const [compId, setCompId] = useState<string | null>(null);
  const [compDetail, setCompDetail] = useState<RunDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchRunDetail(runId),
      fetchPlanRunDetail(planRunId),
    ]).then(([d, pr]) => {
      setDetail(d);
      setPlanRun(pr);
      setLoading(false);
    });
  }, [runId, planRunId]);

  useEffect(() => {
    if (compId) {
      fetchRunDetail(compId).then(d => setCompDetail(d));
    } else {
      setCompDetail(null);
    }
  }, [compId]);

  const onEventClick = useCallback((t: number) => { setZoomRange([Math.max(0, t - 90), t + 90]); }, []);
  const onResetZoom = useCallback(() => setZoomRange(null), []);
  const onCompSelect = useCallback((id: string) => { setCompId(id); setShowComp(false); }, []);

  const stats = useMemo(() => detail ? computeStatBubbles(detail.metrics) : null, [detail]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading scenario...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!detail) {
    return (
      <PortalLayout>
        <div className="card text-center py-12">
          <p className="text-[16px] mb-4" style={{ color: 'var(--rm-text-secondary)' }}>Scenario run not found</p>
          <Link href={`/dashboard/runs/${planRunId}`} className="btn btn-primary">Back to Plan</Link>
        </div>
      </PortalLayout>
    );
  }

  const { run, metrics, events, aiAnalysis } = detail;
  const planName = planRun?.plan_name.replace(/ \(Auto\)$/, '') ?? 'Plan';

  return (
    <PortalLayout>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/dashboard/analytics" className="text-[13px] transition-colors hover:underline" style={{ color: 'var(--rm-text-muted)' }}>Analytics</Link>
            <span style={{ color: 'var(--rm-text-muted)' }}>/</span>
            <Link href={`/dashboard/runs/${planRunId}`} className="text-[13px] transition-colors hover:underline" style={{ color: 'var(--rm-text-muted)' }}>{planName}</Link>
            <span style={{ color: 'var(--rm-text-muted)' }}>/</span>
          </div>
          <h1 className="text-[20px] font-semibold truncate" style={{ color: 'var(--rm-text)' }}>{run.scenarioName || run.name}</h1>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {zoomRange && <button onClick={onResetZoom} className="btn btn-ghost text-[13px]" style={{ color: 'var(--rm-caution)' }}>Reset Zoom</button>}
          <button onClick={() => setShowComp(true)} className="btn btn-secondary text-[13px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            Compare
          </button>
          <button onClick={() => setDrawerOpen(true)} className="btn btn-secondary text-[13px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            Details
          </button>
        </div>
      </div>

      {/* Stat Bubbles */}
      {stats && (
        <div className="flex flex-wrap gap-2 mb-1">
          {[
            { label: 'Stability', value: String(run.stabilityScore), color: run.stabilityScore >= 80 ? 'var(--rm-pass)' : run.stabilityScore >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)' },
            { label: 'Peak RPS', value: stats.p95Rps.toFixed(1), color: 'var(--rm-signal)' },
            { label: 'P95 Latency', value: stats.p95Latency.toFixed(0) + ' ms', color: 'var(--rm-caution)' },
            { label: 'Error %', value: stats.errorPct.toFixed(2) + '%', color: stats.errorPct > 5 ? 'var(--rm-fail)' : stats.errorPct > 1 ? 'var(--rm-caution)' : 'var(--rm-pass)' },
            { label: 'Timeout %', value: stats.timeoutPct.toFixed(2) + '%', color: stats.timeoutPct > 5 ? 'var(--rm-fail)' : stats.timeoutPct > 1 ? 'var(--rm-caution)' : 'var(--rm-pass)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 min-w-[100px] px-3 py-2 text-center rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>{label}</p>
              <p className="text-[18px] font-bold tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart Card */}
      <div className="rounded-xl mb-3" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)', padding: '8px 20px 16px' }}>
        <PrimaryChart metrics={metrics} events={events} zoomRange={zoomRange} comparisonMetrics={compDetail?.metrics} onEventClick={onEventClick} />
      </div>

      <div className="card mb-5">
        <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--rm-text)' }}>Event Timeline</h3>
        <EventTimeline events={events} onEventClick={onEventClick} />
      </div>

      {/* Details Drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="fixed top-0 right-0 z-50 h-full overflow-y-auto"
            style={{
              width: '380px',
              background: 'var(--rm-bg-surface)',
              borderLeft: '1px solid var(--rm-border)',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
              animation: 'slideInRight 0.2s ease-out',
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ background: 'var(--rm-bg-surface)', borderBottom: '1px solid var(--rm-border)' }}>
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Scenario Details</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'var(--rm-text-muted)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="card">
                <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>{run.scenarioName || run.name}</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Plan</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{planName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Environment</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{run.environment}</p>
                    {run.environmentUrl && (
                      <p className="text-[12px] font-mono truncate mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{run.environmentUrl}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Protocol</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{STEP_TYPE_LABELS[run.stepType ?? ''] ?? 'REST / HTTP'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Load Pattern</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{formatPatternType(run.loadPattern || run.scenarioType)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Test Mode</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{POLICY_MODE_LABELS[run.policyMode ?? ''] ?? 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Duration</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{formatDuration(run.durationSeconds)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Peak Concurrency</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{run.peakConcurrency} VUs</p>
                  </div>
                </div>
              </div>

              <AiPanel analysis={aiAnalysis} onEvidenceClick={onEventClick} embedded />
            </div>
          </div>
        </>
      )}

      {showComp && <ComparisonModal currentRunId={runId} onSelect={onCompSelect} onClose={() => setShowComp(false)} />}
    </PortalLayout>
  );
}
