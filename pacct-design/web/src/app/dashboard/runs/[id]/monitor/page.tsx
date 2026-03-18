'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PortalLayout from '@/components/layout/PortalLayout';
import LiveMetricsStrip from '@/components/live/LiveMetricsStrip';
import StreamingChart from '@/components/live/StreamingChart';
import TopologyVisualization from '@/components/live/TopologyVisualization';
import { useTopoConfig } from '@/hooks/useInfraStream';
import { useRunStream, type StepSummary } from '@/hooks/useRunStream';
import type { PlanRunDetail, PlanRunScenarioDetail } from '@/data/types';

const PHASES_ORDERED = [
  { key: 'queued', label: 'Queued' },
  { key: 'starting', label: 'Starting' },
  { key: 'translating', label: 'Translating Scenario' },
  { key: 'running', label: 'Running' },
  { key: 'parsing', label: 'Parsing Results' },
  { key: 'analyzing', label: 'Running Analytics' },
  { key: 'ai_narrative', label: 'Analysing' },
  { key: 'scoring', label: 'Computing Score' },
  { key: 'ingesting', label: 'Saving Results' },
] as const;

function getPhaseIndex(phase: string): number {
  return PHASES_ORDERED.findIndex(p => p.key === phase);
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 3600) return `${Math.round(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
  return `${seconds}s`;
}

function patternLabel(type?: string): string {
  if (!type) return 'Constant';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--rm-signal)',
  POST: '#E5C07B',
  PUT: '#4A90D9',
  PATCH: '#C678DD',
  DELETE: 'var(--rm-fail)',
  HEAD: 'var(--rm-text-muted)',
  OPTIONS: 'var(--rm-text-muted)',
};

function StepRow({ step, index, isExecuting }: { step: StepSummary; index: number; isExecuting: boolean }) {
  const methodColor = step.method ? (METHOD_COLORS[step.method] ?? 'var(--rm-text-muted)') : 'var(--rm-signal)';
  const typeLabel = step.step_type === 'graphql'
    ? (step.operation_type ?? 'query').toUpperCase()
    : step.method ?? step.step_type.toUpperCase();

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
      style={{ background: isExecuting ? 'var(--rm-signal-glow)' : 'transparent' }}
    >
      <span className="text-[11px] font-mono w-5 text-right flex-shrink-0" style={{ color: 'var(--rm-text-muted)' }}>
        {index + 1}
      </span>
      <span
        className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${methodColor} 15%, transparent)`, color: methodColor, minWidth: 44, textAlign: 'center' }}
      >
        {typeLabel}
      </span>
      <span className="text-[13px] font-medium truncate" style={{ color: isExecuting ? 'var(--rm-text)' : 'var(--rm-text-secondary)' }}>
        {step.name || step.path || 'Unnamed Step'}
      </span>
      {step.path && step.name && (
        <span className="text-[11px] font-mono truncate" style={{ color: 'var(--rm-text-muted)' }}>
          {step.path}
        </span>
      )}
      {isExecuting && (
        <span className="ml-auto flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="3" className="animate-spin">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenarios Panel — left sidebar showing scenarios in the run
// ---------------------------------------------------------------------------

function ScenarioStatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--rm-signal)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--rm-bg-void)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: '2px solid var(--rm-signal)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="3" className="animate-spin">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--rm-fail)' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--rm-bg-void)" strokeWidth="3.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    );
  }
  // pending / queued
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--rm-bg-raised)' }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--rm-text-muted)', opacity: 0.3 }} />
    </div>
  );
}

function PlanPanel({ planContext }: { planContext: PlanRunDetail }) {
  const scenarios = planContext.scenarios.sort((a, b) => a.index - b.index);
  const completedCount = scenarios.filter(s => s.status === 'completed').length;
  const planName = planContext.plan_name.replace(/ \(Auto\)$/, '');

  return (
    <div className="card h-fit" style={{ minWidth: 0 }}>
      <div className="mb-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>
          Scenarios
        </h3>
        <p className="text-[14px] font-semibold mt-0.5 truncate" style={{ color: 'var(--rm-text)' }} title={planName}>
          {planName}
        </p>
      </div>

      <div className="space-y-0.5">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all"
            style={{
              background: s.status === 'running' ? 'var(--rm-signal-glow)' : 'transparent',
            }}
          >
            <ScenarioStatusIcon status={s.status} />
            <div className="min-w-0 flex-1">
              <span
                className="text-[12px] font-medium block truncate"
                style={{
                  color: s.status === 'running' ? 'var(--rm-text)'
                    : s.status === 'completed' ? 'var(--rm-text-secondary)'
                    : s.status === 'failed' ? 'var(--rm-fail)'
                    : 'var(--rm-text-muted)',
                }}
              >
                {s.scenario_name ?? `Scenario ${s.index + 1}`}
              </span>
              {s.status === 'completed' && s.duration_seconds != null && (
                <span className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>
                  {formatDuration(s.duration_seconds)}
                </span>
              )}
              {s.status === 'failed' && s.error && (
                <span className="text-[10px] block truncate" style={{ color: 'var(--rm-fail)' }} title={s.error}>
                  {s.error}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--rm-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            {completedCount}/{scenarios.length} scenarios
          </span>
          <div className="w-16 rounded-full overflow-hidden" style={{ height: 3, background: 'var(--rm-bg-raised)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: scenarios.length > 0 ? `${(completedCount / scenarios.length) * 100}%` : '0%',
                background: 'var(--rm-signal)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main monitor page
// ---------------------------------------------------------------------------

export default function RunMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const planRunId = params.id as string;
  const topoConfig = useTopoConfig();

  // Poll plan context to get scenario list and discover the active scenario's run_id
  const [planContext, setPlanContext] = useState<PlanRunDetail | null>(null);

  const fetchPlanContext = useCallback(() => {
    fetch(`/api/plan-runs/${planRunId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.plan_run) setPlanContext(data.plan_run); })
      .catch(() => {});
  }, [planRunId]);

  useEffect(() => {
    fetchPlanContext();
    const interval = setInterval(fetchPlanContext, 3000);
    return () => clearInterval(interval);
  }, [fetchPlanContext]);

  // Derive active scenario run_id from plan context
  const activeScenario = planContext?.scenarios.find(s => s.status === 'running');
  const activeRunId = activeScenario?.run_id ?? null;

  // Connect SSE to the active scenario's run_id (not the plan_run_id)
  const { status, metrics, currentMetric, phase, elapsed } = useRunStream(activeRunId);

  const currentPhaseIndex = getPhaseIndex(phase);
  const progressPct = status?.progress_pct ?? 0;
  const isTerminal = planContext?.status === 'completed' || planContext?.status === 'failed';
  const isRunningK6 = phase === 'running';
  const hasMetrics = metrics.length > 0;
  const steps = status?.steps ?? [];
  const loadProfile = status?.load_profile;
  const scenarioName = status?.scenario_name ?? activeScenario?.scenario_name;

  // Redirect to results on plan completion
  useEffect(() => {
    if (planContext?.status === 'completed' || planContext?.status === 'failed') {
      const timer = setTimeout(() => {
        router.push(`/dashboard/runs/${planRunId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [planContext?.status, planRunId, router]);

  return (
    <PortalLayout>
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/analytics" className="text-[13px] transition-colors" style={{ color: 'var(--rm-text-muted)' }}>Analytics</Link>
          <span style={{ color: 'var(--rm-text-muted)' }}>/</span>
          {scenarioName && (
            <>
              <span className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>{scenarioName}</span>
              <span style={{ color: 'var(--rm-text-muted)' }}>/</span>
            </>
          )}
          <span className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>Live Monitor</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-semibold" style={{ color: 'var(--rm-text)' }}>
              {scenarioName ?? 'Run Monitor'}
            </h1>
            {!isTerminal && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--rm-signal)' }} />
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: 'var(--rm-signal)' }} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] font-mono" style={{ color: 'var(--rm-text-muted)' }}>{planRunId.slice(0, 8)}</span>
            <span className="text-[20px] font-semibold font-mono" style={{ color: 'var(--rm-text)' }}>{formatElapsed(elapsed)}</span>
          </div>
        </div>

        {/* Scenario context badges */}
        {(loadProfile || status?.base_url) && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {status?.base_url && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}>
                {status.base_url}
              </span>
            )}
            {loadProfile && (
              <>
                <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>
                  {loadProfile.virtual_users} VUs
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' }}>
                  {patternLabel(loadProfile.pattern_type)}
                </span>
                {loadProfile.duration_seconds && (
                  <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' }}>
                    {formatDuration(loadProfile.duration_seconds)}
                  </span>
                )}
              </>
            )}
            {steps.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' }}>
                {steps.length} step{steps.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main layout: Scenarios panel (25%) + Content (75%) */}
      <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
        {/* Scenarios panel — left 25% */}
        {planContext && (
          <div style={{ width: '25%', flexShrink: 0 }}>
            <PlanPanel planContext={planContext} />
          </div>
        )}

        {/* Main content — right 75% */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Progress bar */}
          <div className="card mb-3" style={{ padding: '10px 20px' }}>
            <div className="flex items-center justify-between mb-1.5">
              {isTerminal && planContext?.status === 'completed' ? (
                <Link
                  href={`/dashboard/runs/${planRunId}`}
                  className="text-[13px] font-medium no-underline transition-opacity hover:opacity-80 flex items-center gap-1.5"
                  style={{ color: 'var(--rm-signal)' }}
                >
                  Complete — View Results
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </Link>
              ) : (
                <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
                  {planContext?.status === 'failed' ? 'Failed' : status?.message || 'Connecting...'}
                </span>
              )}
              <span className="text-[13px] font-mono" style={{ color: 'var(--rm-text-muted)' }}>{progressPct}%</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--rm-bg-raised)' }}>
              {planContext?.status === 'failed' ? (
                <div className="h-full rounded-full" style={{ width: '100%', background: 'var(--rm-fail)' }} />
              ) : isTerminal ? (
                <div className="h-full rounded-full transition-all duration-500" style={{ width: '100%', background: 'var(--rm-signal)' }} />
              ) : progressPct > 0 ? (
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--rm-signal)' }} />
              ) : (
                <div className="h-full rounded-full indeterminate-bar" />
              )}
            </div>
          </div>

          {/* Scenario Steps — always visible when we have step data */}
          {steps.length > 0 && (
            <div className="card mb-3" style={{ padding: '12px 16px' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>
                  Scenario Steps
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{
                  background: isRunningK6 ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                  color: isRunningK6 ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
                }}>
                  {isRunningK6 ? 'All steps executing' : isTerminal ? `${steps.length} steps completed` : `${steps.length} step${steps.length !== 1 ? 's' : ''} queued`}
                </span>
              </div>
              <div className="space-y-0.5">
                {steps.map((step, i) => (
                  <StepRow
                    key={step.name + i}
                    step={step}
                    index={i}
                    isExecuting={isRunningK6}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Live Metrics — shown during load test execution */}
          {(isRunningK6 || hasMetrics) && (
            <>
              <div className="mb-3">
                <LiveMetricsStrip
                  current={currentMetric}
                  isRunning={isRunningK6}
                />
              </div>

              {hasMetrics && (
                <div className="card mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>Live Metrics</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span style={{ width: 12, height: 2, background: '#4A90D9', borderRadius: 1, display: 'inline-block' }} />
                        <span className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>P95 (ms)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span style={{ width: 12, height: 2, background: 'var(--rm-pass)', borderRadius: 1, display: 'inline-block', opacity: 0.6 }} />
                        <span className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>RPS</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span style={{ width: 12, height: 1, borderTop: '2px dotted var(--rm-fail)', display: 'inline-block', opacity: 0.6 }} />
                        <span className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>Errors</span>
                      </div>
                    </div>
                  </div>
                  <StreamingChart metrics={metrics} />
                </div>
              )}
            </>
          )}

          {/* Pipeline Phases + Topology side by side */}
          <div className="flex gap-3" style={{ alignItems: 'flex-start' }}>
            {/* Phase Steps */}
            <div className="card flex-1">
              <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--rm-text)' }}>Pipeline Phases</h3>
              <div className="space-y-1">
                {PHASES_ORDERED.map((p, i) => {
                  let pState: 'done' | 'active' | 'pending' | 'failed' = 'pending';
                  if (status?.state === 'failed' && p.key === phase) {
                    pState = 'failed';
                  } else if (status?.state === 'completed' || i < currentPhaseIndex) {
                    pState = 'done';
                  } else if (i === currentPhaseIndex) {
                    pState = 'active';
                  }

                  return (
                    <div
                      key={p.key}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                      style={{ background: pState === 'active' ? 'var(--rm-signal-glow)' : pState === 'failed' ? 'rgba(211,93,93,0.08)' : 'transparent' }}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{
                        background: pState === 'done' ? 'var(--rm-signal)' : pState === 'failed' ? 'var(--rm-fail)' : 'var(--rm-bg-raised)',
                        border: pState === 'active' ? '2px solid var(--rm-signal)' : 'none',
                      }}>
                        {pState === 'done' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : pState === 'active' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="3" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" /></svg>
                        ) : pState === 'failed' ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text)" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--rm-text-muted)', opacity: 0.3 }} />
                        )}
                      </div>
                      <span className="text-[12px] font-medium" style={{
                        color: pState === 'done' ? 'var(--rm-text-secondary)' : pState === 'active' ? 'var(--rm-text)' : pState === 'failed' ? 'var(--rm-fail)' : 'var(--rm-text-muted)',
                      }}>
                        {p.label}
                      </span>
                      {pState === 'active' && p.key === 'running' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--rm-signal-muted)', color: 'var(--rm-signal)' }}>
                          load test
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Terminal states */}
              {isTerminal && planContext?.status === 'completed' && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--rm-border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--rm-signal)' }}>Completed</span>
                    </div>
                    <Link
                      href={`/dashboard/runs/${planRunId}`}
                      className="btn btn-primary text-[12px] no-underline flex items-center gap-1.5"
                    >
                      View Results
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    </Link>
                  </div>
                </div>
              )}

              {isTerminal && planContext?.status === 'failed' && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--rm-border)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        <span className="text-[13px] font-semibold" style={{ color: 'var(--rm-fail)' }}>Failed</span>
                      </div>
                    </div>
                    <Link href="/dashboard/scenarios" className="btn btn-secondary text-[12px] no-underline">Back to Scenarios</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Load Topology — shown alongside pipeline phases */}
            {(isRunningK6 || hasMetrics) && (
              <div className="card flex-1">
                <h3 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Load Topology</h3>
                <TopologyVisualization
                  currentMetric={currentMetric}
                  isRunning={isRunningK6}
                  topoConfig={topoConfig}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .indeterminate-bar {
          background: var(--rm-signal);
          width: 30%;
          animation: indeterminate 1.5s ease-in-out infinite;
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(450%); }
        }
      `}</style>
    </PortalLayout>
  );
}
