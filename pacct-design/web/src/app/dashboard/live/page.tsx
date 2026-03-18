'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import RunInfoBar from '@/components/live/RunInfoBar';
import LiveMetricsStrip from '@/components/live/LiveMetricsStrip';
import StreamingChart from '@/components/live/StreamingChart';
import TopologyVisualization from '@/components/live/TopologyVisualization';
import { useTopoConfig } from '@/hooks/useInfraStream';
import { useRunStream } from '@/hooks/useRunStream';
import type { MetricPoint } from '@/data/types';
import type { Scenario } from '@loadtoad/schema';

type LivePhase = 'idle' | 'ramp-up' | 'steady' | 'ramp-down' | 'completed';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m${s > 0 ? ` ${s}s` : ''}`;
}

function ElapsedTimer({ since, maxSeconds }: { since: string; maxSeconds?: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const raw = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const elapsed = maxSeconds != null ? Math.min(raw, maxSeconds) : raw;
  return <>{formatDuration(elapsed)}</>;
}

/** Map worker phases to the Live page phases that RunInfoBar understands */
function mapPhase(phase: string): LivePhase {
  switch (phase) {
    case 'queued':
    case 'starting':
    case 'translating':
      return 'ramp-up';
    case 'running':
      return 'steady';
    case 'parsing':
    case 'analyzing':
    case 'ai_narrative':
    case 'scoring':
    case 'ingesting':
      return 'ramp-down';
    case 'completed':
    case 'stopped':
    case 'failed':
      return 'completed';
    default:
      return 'idle';
  }
}

function CollapsibleCard({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ padding: '12px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-left"
        style={{ color: 'var(--rm-text)' }}
      >
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>{title}</h3>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-muted)" strokeWidth="2" strokeLinecap="round"
          className="transition-transform flex-shrink-0"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export default function LiveDashboardPage() {
  return (
    <Suspense fallback={<PortalLayout><PageHeader title="Live Test" description="" /><div className="card text-center py-12"><p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading...</p></div></PortalLayout>}>
      <LiveDashboardInner />
    </Suspense>
  );
}

interface ActivePlanScenario {
  index: number;
  status: string;
  run_id: string | null;
  scenario_id: string | null;
  scenario_name: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  configured_duration_seconds: number | null;
  error: string | null;
}

interface ActivePlanRun {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  total_scenarios: number;
  completed_scenarios: number;
  failed_scenarios: number;
  started_at: string | null;
  environment_name: string | null;
  scenarios: ActivePlanScenario[];
}

function parsePlanRun(pr: Record<string, unknown>): ActivePlanRun {
  return {
    id: pr.id as string,
    plan_id: pr.plan_id as string,
    plan_name: pr.plan_name as string,
    status: pr.status as string,
    total_scenarios: pr.total_scenarios as number,
    completed_scenarios: pr.completed_scenarios as number,
    failed_scenarios: pr.failed_scenarios as number,
    started_at: (pr.started_at as string) ?? null,
    environment_name: (pr.environment_name as string) ?? null,
    scenarios: ((pr.scenarios as Record<string, unknown>[]) ?? []).map((s) => ({
      index: s.index as number,
      status: s.status as string,
      run_id: (s.run_id as string) ?? null,
      scenario_id: (s.scenario_id as string) ?? null,
      scenario_name: (s.scenario_name as string) ?? 'Unnamed',
      started_at: (s.started_at as string) ?? null,
      completed_at: (s.completed_at as string) ?? null,
      duration_seconds: (s.duration_seconds as number) ?? null,
      configured_duration_seconds: (s.configured_duration_seconds as number) ?? null,
      error: (s.error as string) ?? null,
    })),
  };
}

/** Tab bar for switching between multiple active plan runs */
function PlanTabBar({
  plans,
  selectedId,
  onSelect,
}: {
  plans: ActivePlanRun[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
      {plans.map((plan) => {
        const isSelected = plan.id === selectedId;
        const isRunning = plan.status === 'running' || plan.status === 'queued';
        const isFailed = plan.status === 'failed';
        const isCompleted = plan.status === 'completed';
        const displayName = plan.plan_name?.replace(/ \(Auto\)$/, '') ?? 'Run';

        return (
          <button
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap flex-shrink-0"
            style={{
              background: isSelected ? 'var(--rm-bg-raised)' : 'transparent',
              border: `1px solid ${isSelected ? 'var(--rm-signal)' : 'var(--rm-border)'}`,
              color: isSelected ? 'var(--rm-text)' : 'var(--rm-text-secondary)',
            }}
          >
            {/* Status indicator */}
            {isRunning && (
              <span
                className="w-[8px] h-[8px] rounded-full flex-shrink-0 border-[1.5px]"
                style={{
                  borderColor: 'var(--rm-signal)',
                  borderTopColor: 'transparent',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            )}
            {isCompleted && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {isFailed && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}

            <span className="truncate" style={{ maxWidth: '180px' }}>{displayName}</span>

            {/* Progress */}
            <span
              className="text-[11px] font-mono flex-shrink-0"
              style={{ color: 'var(--rm-text-muted)' }}
            >
              {plan.completed_scenarios}/{plan.total_scenarios}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LiveDashboardInner() {
  const searchParams = useSearchParams();
  const urlRunId = searchParams.get('run_id');
  const awaiting = searchParams.get('awaiting') === '1';
  const urlPlanRunId = searchParams.get('plan_run_id');
  const topoConfig = useTopoConfig();

  const [discoveredRunId, setDiscoveredRunId] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState<string | null>(null);
  const [checking, setChecking] = useState(!urlRunId);
  const [noRun, setNoRun] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePlans, setActivePlans] = useState<ActivePlanRun[]>([]);
  const [selectedPlanRunId, setSelectedPlanRunId] = useState<string | null>(urlPlanRunId ?? null);
  const [scenarioPopout, setScenarioPopout] = useState<Scenario | null>(null);
  const [scenarioPopoutLoading, setScenarioPopoutLoading] = useState(false);
  // User-selected scenario index (null = auto-select first running)
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number | null>(null);

  const prevPlanDerivedRunIdRef = useRef<string | null>(null);

  // Derive the currently selected plan
  const activePlan = useMemo(
    () => activePlans.find((p) => p.id === selectedPlanRunId) ?? activePlans[0] ?? null,
    [activePlans, selectedPlanRunId],
  );

  // Auto-select first plan if nothing is selected yet
  useEffect(() => {
    if (!selectedPlanRunId && activePlans.length > 0) {
      // Prefer a running plan over a queued one
      const running = activePlans.find((p) => p.status === 'running');
      setSelectedPlanRunId(running?.id ?? activePlans[0].id);
    }
  }, [selectedPlanRunId, activePlans]);

  // Derive planDerivedRunId synchronously from the selected plan's scenario.
  // If user has clicked a specific scenario, use that. Otherwise auto-select
  // the first running scenario (supports concurrent execution).
  const planDerivedRunId = useMemo(() => {
    if (!activePlan) return null;
    // User-selected scenario takes priority
    if (selectedScenarioIndex != null) {
      const selected = activePlan.scenarios.find((s) => s.index === selectedScenarioIndex);
      if (selected?.run_id) return selected.run_id;
    }
    // Auto: pick the first running scenario
    const runningScenario = activePlan.scenarios.find((s) => s.status === 'running');
    if (runningScenario?.run_id) return runningScenario.run_id;
    // Fallback: when all scenarios are done, show the last one with a run_id
    const withRunId = activePlan.scenarios.filter((s) => s.run_id);
    if (withRunId.length > 0) return withRunId[withRunId.length - 1].run_id;
    return null;
  }, [activePlan, selectedScenarioIndex]);

  // Helper to merge plan runs into state (upsert by id, remove stale ones)
  const mergePlans = useCallback((incoming: ActivePlanRun[]) => {
    setActivePlans((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const plan of incoming) {
        map.set(plan.id, plan);
      }
      return [...map.values()];
    });
  }, []);

  // ── Discovery polling (for non-plan direct runs) ──────────────────────
  useEffect(() => {
    if (urlRunId || urlPlanRunId) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const check = () =>
      fetch('/api/runs/active')
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (data?.active && data.run_id) {
            setDiscoveredRunId(data.run_id);
            setScenarioName(data.scenario_name ?? null);
            setChecking(false);
            if (interval) clearInterval(interval);
            interval = setInterval(check, 10_000);
          } else if (!awaiting) {
            setChecking(false);
            setNoRun(true);
          }
        })
        .catch(() => {
          if (!cancelled && !awaiting) {
            setChecking(false);
            setNoRun(true);
          }
        });

    check();
    interval = setInterval(check, 2_000);
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [urlRunId, urlPlanRunId, awaiting]);

  // ── Plan run polling — for URL-directed plan_run_id ────────────────────
  useEffect(() => {
    if (!urlPlanRunId) return;
    let cancelled = false;

    setChecking(false);

    const poll = () => {
      fetch(`/api/plan-runs/${urlPlanRunId}`)
        .then(r => r.json())
        .then(data => {
          if (cancelled || !data?.plan_run) return;
          const plan = parsePlanRun(data.plan_run);
          mergePlans([plan]);
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 3_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [urlPlanRunId, mergePlans]);

  // ── Poll /api/plan-runs/active for all active plans ────────────────────
  useEffect(() => {
    if (urlRunId) return;
    let cancelled = false;

    const poll = () => {
      fetch('/api/plan-runs/active')
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (data?.active && data.plan_runs?.length > 0) {
            const plans = (data.plan_runs as Record<string, unknown>[]).map(parsePlanRun);
            mergePlans(plans);
            setNoRun(false);
            setChecking(false);
          } else {
            // No active plans — check if any previously-active plans need final status
            setActivePlans((prev) => {
              const stillRunning = prev.filter(
                (p) => p.status === 'running' || p.status === 'queued',
              );
              if (stillRunning.length > 0) {
                // Fetch final status for each
                for (const p of stillRunning) {
                  fetch(`/api/plan-runs/${p.id}`)
                    .then(r => r.json())
                    .then(detail => {
                      if (cancelled || !detail?.plan_run) return;
                      const updated = parsePlanRun(detail.plan_run);
                      mergePlans([updated]);
                    })
                    .catch(() => {});
                }
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 3_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [urlRunId, mergePlans]);

  // ── Clear stream cache when switching scenarios ───────────────────────
  useEffect(() => {
    if (planDerivedRunId && planDerivedRunId !== prevPlanDerivedRunIdRef.current) {
      if (prevPlanDerivedRunIdRef.current) {
        try { sessionStorage.removeItem(`sv-stream-${prevPlanDerivedRunIdRef.current}`); } catch {}
      }
      prevPlanDerivedRunIdRef.current = planDerivedRunId;
    }
  }, [planDerivedRunId]);

  // ── Determine effective run_id for SSE stream ─────────────────────────
  const directRunId = urlRunId ?? discoveredRunId;
  const runId = (urlPlanRunId || activePlans.length > 0) ? planDerivedRunId : directRunId;

  const stream = useRunStream(runId);

  // ── Plan-level status ─────────────────────────────────────────────────
  const planStillRunning = activePlan && (activePlan.status === 'running' || activePlan.status === 'queued');
  const planCompleted = activePlan && (activePlan.status === 'completed' || activePlan.status === 'failed' || activePlan.status === 'cancelled');

  // isRunning reflects the *currently viewed* scenario's actual state.
  // Topology, metrics strip, and other visuals stop as soon as this run finishes.
  const currentRunActive = !!runId && stream.status?.state === 'active';
  const isRunning = currentRunActive;
  const hasMetrics = stream.metrics.length > 0;

  // livePhase reflects the currently viewed scenario, not the overall plan
  const streamTerminal = stream.status?.state === 'completed' || stream.status?.state === 'failed';
  // Derive the currently-viewed scenario's plan-level status (fallback when stream has no status)
  const viewedScenario = activePlan?.scenarios.find((s) => s.run_id === runId);
  const viewedScenarioDone = viewedScenario && (viewedScenario.status === 'completed' || viewedScenario.status === 'failed');
  const livePhase: LivePhase = (urlPlanRunId || activePlans.length > 0)
    ? (streamTerminal ? 'completed' : viewedScenarioDone ? 'completed' : planCompleted ? 'completed' : (runId ? mapPhase(stream.phase) : 'ramp-up'))
    : (streamTerminal ? 'completed' : mapPhase(stream.phase));

  const planName = activePlan?.plan_name?.replace(/ \(Auto\)$/, '') ?? null;
  const testName = planName ?? scenarioName ?? stream.status?.scenario_name ?? 'Load Test';

  const liveMetric = stream.currentMetric;

  const openScenarioPopout = useCallback((scenarioId: string) => {
    setScenarioPopoutLoading(true);
    fetch(`/api/scenarios/${scenarioId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setScenarioPopout(data as Scenario);
        setScenarioPopoutLoading(false);
      })
      .catch(() => setScenarioPopoutLoading(false));
  }, []);

  // ── Loading / waiting state ───────────────────────────────────────────
  if (checking || (awaiting && !runId && activePlans.length === 0)) {
    return (
      <PortalLayout>
        <PageHeader title="Live Test" description="" />
        <div className="card text-center py-12">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="3" className="animate-spin mx-auto mb-3">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Waiting for run to start...</p>
        </div>
      </PortalLayout>
    );
  }

  if (noRun && !runId && !planStillRunning && activePlans.length === 0) {
    return (
      <PortalLayout>
        <PageHeader title="Live Test" description="" />
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--rm-text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>No active runs</p>
          <p className="text-[13px] mb-4">Start a load test from the Scenarios page to see live metrics here.</p>
          <Link href="/dashboard/scenarios" className="btn btn-primary text-[13px] no-underline">Go to Scenarios</Link>
        </div>
      </PortalLayout>
    );
  }

  const effectivePlanRunId = urlPlanRunId ?? activePlan?.id;

  // ── Main layout ───────────────────────────────────────────────────────
  return (
    <PortalLayout>
      <PageHeader
        title={activePlans.length > 1 ? 'Live Tests' : testName}
        description=""
        actions={
          <button onClick={() => setDrawerOpen(true)} className="btn btn-secondary text-[13px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            Details
          </button>
        }
      />

      {/* Run Tab Bar — shown when multiple runs exist */}
      {activePlans.length > 1 && (
        <PlanTabBar
          plans={activePlans}
          selectedId={activePlan?.id ?? null}
          onSelect={setSelectedPlanRunId}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scenarios + Topology — left 1/3 */}
        <div className="lg:col-span-1 space-y-4">
        <div className="card" style={{ maxHeight: '400px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>Scenarios</h3>
            {activePlan && (
              <span className="text-[12px] font-mono" style={{ color: 'var(--rm-text-muted)' }}>
                {activePlan.completed_scenarios}/{activePlan.total_scenarios}
              </span>
            )}
          </div>
          {!activePlan ? (
            <div className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
              No active scenarios.
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 min-h-0">
              <div className="space-y-1.5">
                {activePlan.scenarios.map(s => {
                  // For the currently viewed scenario, use SSE stream state for real-time status
                  const isViewed = s.run_id != null && s.run_id === runId;
                  let effectiveStatus = s.status;
                  if (isViewed && streamTerminal) {
                    effectiveStatus = stream.status?.state === 'failed' ? 'failed' : 'completed';
                  } else if (planCompleted && s.status === 'running') {
                    effectiveStatus = 'completed';
                  }

                  const isCompleted = effectiveStatus === 'completed';
                  const isScenarioRunning = effectiveStatus === 'running';
                  const isFailed = effectiveStatus === 'failed';
                  const isPending = effectiveStatus === 'pending' || effectiveStatus === 'skipped';
                  const isSelected = isViewed;

                  // Detect when k6 test is done but pipeline is still processing
                  const elapsedSec = isScenarioRunning && s.started_at
                    ? Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000)
                    : 0;
                  const isProcessing = isScenarioRunning && s.configured_duration_seconds != null
                    && elapsedSec > s.configured_duration_seconds + 5;

                  // Clickable: switch the viewed scenario
                  const canSelect = s.run_id != null;

                  return (
                    <div
                      key={s.index}
                      className="rounded-lg px-3 py-2.5 transition-all"
                      style={{
                        background: isSelected ? 'var(--rm-signal-glow)' : isScenarioRunning ? 'rgba(0,206,147,0.04)' : 'var(--rm-bg-card)',
                        border: `1px solid ${isSelected ? 'var(--rm-signal)' : isFailed ? 'var(--rm-fail)' : isScenarioRunning ? 'rgba(0,206,147,0.2)' : 'var(--rm-border)'}`,
                        cursor: canSelect ? 'pointer' : 'default',
                      }}
                      onClick={() => { if (canSelect) setSelectedScenarioIndex(s.index); }}
                    >
                      {/* Row: status + name + duration + actions */}
                      <div className="flex items-center gap-2">
                        {/* Status indicator */}
                        {isCompleted && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {isFailed && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                        {isScenarioRunning && (
                          <span
                            className="w-[10px] h-[10px] rounded-full flex-shrink-0 border-2"
                            style={{
                              borderColor: isProcessing ? 'var(--rm-caution)' : 'var(--rm-signal)',
                              borderTopColor: 'transparent',
                              animation: `spin ${isProcessing ? '1.5s' : '0.8s'} linear infinite`,
                            }}
                          />
                        )}
                        {isPending && (
                          <span
                            className="w-[10px] h-[10px] rounded-full flex-shrink-0"
                            style={{ background: 'var(--rm-border)' }}
                          />
                        )}

                        <span
                          className="text-[13px] truncate flex-1"
                          style={{
                            color: isSelected ? 'var(--rm-text)' : isScenarioRunning ? 'var(--rm-text)' : isPending ? 'var(--rm-text-muted)' : isFailed ? 'var(--rm-fail)' : 'var(--rm-text-secondary)',
                            fontWeight: isSelected || isScenarioRunning ? 600 : 500,
                          }}
                        >
                          {s.scenario_name}
                        </span>

                        {/* View Results link — gray until ready, green when done */}
                        {(() => {
                          const hasResults = (isCompleted || isFailed) && s.run_id && effectivePlanRunId;
                          if (hasResults) {
                            return (
                              <Link
                                href={`/dashboard/runs/${effectivePlanRunId}/scenarios/${s.run_id}`}
                                className="flex items-center gap-1 text-[11px] no-underline flex-shrink-0 transition-opacity hover:opacity-80"
                                style={{ color: 'var(--rm-pass)' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Results
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                              </Link>
                            );
                          }
                          return (
                            <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--rm-text-muted)', opacity: 0.5 }}>
                              View Results
                            </span>
                          );
                        })()}

                        {/* Properties icon — far right, always shown if scenario_id exists */}
                        {s.scenario_id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openScenarioPopout(s.scenario_id!); }}
                            className="flex-shrink-0 p-1 rounded transition-opacity opacity-50 hover:opacity-100"
                            style={{ color: 'var(--rm-text-muted)' }}
                            title="View scenario properties"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Error message */}
                      {isFailed && s.error && (
                        <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--rm-fail)' }} title={s.error}>
                          {s.error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Load Topology — collapsible */}
        <CollapsibleCard title="Load Topology" defaultOpen>
          <TopologyVisualization
            currentMetric={liveMetric}
            isRunning={isRunning}
            injectorCount={stream.injectorCount}
            targetHost={stream.status?.base_url}
            topoConfig={topoConfig}
          />
        </CollapsibleCard>

        {/* Request Targets */}
        <div className="card" style={{ padding: '12px' }}>
          <h3 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Request Targets</h3>
          {stream.status?.steps && stream.status.steps.length > 0 ? (
            <div className="space-y-1.5">
              {stream.status.steps.map((step, i) => {
                const method = step.method ?? (step.step_type === 'graphql' ? (step.operation_type ?? 'GQL') : step.step_type === 'browser' ? 'WEB' : 'GET');
                const path = step.path ?? step.name ?? `Step ${i + 1}`;
                const methodColors: Record<string, string> = {
                  GET: 'var(--rm-signal)',
                  POST: 'var(--rm-pass)',
                  PUT: 'var(--rm-caution)',
                  PATCH: 'var(--rm-caution)',
                  DELETE: 'var(--rm-fail)',
                  GQL: '#e535ab',
                  WEB: 'var(--rm-signal)',
                };
                const color = methodColors[method.toUpperCase()] ?? 'var(--rm-text-muted)';

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-md"
                    style={{ background: 'var(--rm-bg-card)' }}
                  >
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                    >
                      {method.toUpperCase()}
                    </span>
                    <span
                      className="text-[12px] font-mono truncate flex-1"
                      style={{ color: 'var(--rm-text-secondary)' }}
                    >
                      {path}
                    </span>
                    {isRunning && (
                      <span
                        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                        style={{
                          background: 'var(--rm-signal)',
                          animation: 'pulse 2s ease-in-out infinite',
                        }}
                      />
                    )}
                  </div>
                );
              })}
              {stream.status.base_url && (
                <div className="text-[10px] font-mono mt-2 truncate" style={{ color: 'var(--rm-text-muted)' }}>
                  {stream.status.base_url}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4" style={{ color: 'var(--rm-text-muted)' }}>
              <span className="text-[12px]">{isRunning ? 'Waiting for scenario info...' : 'No active requests'}</span>
            </div>
          )}
        </div>

        </div>

        {/* Control bar + charts — right 2/3 */}
        <div className="lg:col-span-2 space-y-2">
          <RunInfoBar
            phase={livePhase}
            elapsed={stream.elapsed}
            totalDuration={stream.totalDuration}
            isRunning={isRunning}
            pipelinePhase={streamTerminal ? (stream.status?.state === 'failed' ? 'failed' : 'completed') : viewedScenarioDone ? (viewedScenario?.status === 'failed' ? 'failed' : 'completed') : planCompleted ? (viewedScenario?.status === 'failed' ? 'failed' : 'completed') : stream.phase}
            runId={runId ?? undefined}
            planRunId={activePlan?.id}
            planStillRunning={!!planStillRunning}
            startedAt={activePlan?.started_at ?? stream.status?.created_at ?? null}
            environmentName={activePlan?.environment_name ?? null}
          />

          <LiveMetricsStrip
            current={liveMetric}
            isRunning={isRunning}
          />

          <div className="mt-1">
            {hasMetrics ? (
              <StreamingChart metrics={stream.metrics} />
            ) : (
              <div className="card flex flex-col items-center justify-center gap-2" style={{ height: 300, color: 'var(--rm-text-muted)' }}>
                {planStillRunning && !currentRunActive && !hasMetrics ? (
                  <span className="text-[13px]">Waiting for next scenario to start...</span>
                ) : isRunning ? (
                  <span className="text-[13px]">Waiting for metrics...</span>
                ) : livePhase === 'completed' && effectivePlanRunId ? (
                  <>
                    <span className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>Test complete.</span>
                    <Link
                      href={`/dashboard/analytics?plan_id=${effectivePlanRunId}`}
                      className="text-[13px] no-underline transition-opacity hover:opacity-80"
                      style={{ color: 'var(--rm-pass)' }}
                    >
                      View Results →
                    </Link>
                  </>
                ) : (
                  <span className="text-[13px]">No metrics data yet</span>
                )}
              </div>
            )}
          </div>
        </div>
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
              <h2 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>{testName}</h2>
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
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Status</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{isRunning ? 'Running' : (streamTerminal || viewedScenarioDone || planCompleted) ? ((stream.status?.state === 'failed' || viewedScenario?.status === 'failed') ? 'Failed' : 'Complete') : stream.phase ? stream.phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Idle'}</p>
                  </div>
                  {stream.status?.scenario_description && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Description</p>
                      <p className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>{stream.status.scenario_description}</p>
                    </div>
                  )}
                  {stream.status?.base_url && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Target</p>
                      <p className="text-[13px] font-mono truncate" style={{ color: 'var(--rm-text-secondary)' }}>{stream.status.base_url}</p>
                    </div>
                  )}
                  {stream.status?.steps && stream.status.steps.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Protocol</p>
                      <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>
                        {{ rest: 'REST / HTTP', graphql: 'GraphQL', browser: 'Web Page' }[stream.status.steps[0].step_type] ?? stream.status.steps[0].step_type}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Virtual Users</p>
                    <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{stream.status?.load_profile?.virtual_users ?? stream.injectorCount} VUs</p>
                  </div>
                  {stream.status?.load_profile?.pattern_type && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Load Pattern</p>
                      <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{stream.status.load_profile.pattern_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                    </div>
                  )}
                  {stream.status?.steps && stream.status.steps.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Steps</p>
                      <p className="text-[15px] font-medium" style={{ color: 'var(--rm-text)' }}>{stream.status.steps.length}</p>
                    </div>
                  )}
                  {stream.status?.created_at && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Started</p>
                      <p className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>{new Date(stream.status.created_at).toLocaleString()}</p>
                      <p className="text-[13px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
                        {Math.floor(stream.elapsed / 60)}m {Math.floor(stream.elapsed % 60)}s
                        {' / '}
                        {Math.floor(stream.totalDuration / 60)}m {Math.floor(stream.totalDuration % 60)}s
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Scenario Metadata Popout */}
      {(scenarioPopout || scenarioPopoutLoading) && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => { setScenarioPopout(null); setScenarioPopoutLoading(false); }}
          />
          <div
            className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl"
            style={{
              width: '420px',
              maxHeight: '80vh',
              background: 'var(--rm-bg-surface)',
              border: '1px solid var(--rm-border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ background: 'var(--rm-bg-surface)', borderBottom: '1px solid var(--rm-border)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>
                {scenarioPopout ? scenarioPopout.metadata.name : 'Loading...'}
              </h2>
              <button
                onClick={() => { setScenarioPopout(null); setScenarioPopoutLoading(false); }}
                className="p-1 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: 'var(--rm-text-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            {scenarioPopoutLoading && !scenarioPopout && (
              <div className="flex items-center justify-center py-12">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="3" className="animate-spin">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
              </div>
            )}
            {scenarioPopout && (
              <div className="p-5 space-y-4">
                {/* Description */}
                {scenarioPopout.metadata.description && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Description</p>
                    <p className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>{scenarioPopout.metadata.description}</p>
                  </div>
                )}

                {/* Target */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Target URL</p>
                  <p className="text-[13px] font-mono truncate" style={{ color: 'var(--rm-text-secondary)' }}>{scenarioPopout.metadata.base_url || '—'}</p>
                </div>

                {/* Load Profile */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Virtual Users</p>
                    <p className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>{scenarioPopout.load_profile.virtual_users}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Duration</p>
                    <p className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>
                      {scenarioPopout.load_profile.duration.fixed
                        ? `${scenarioPopout.load_profile.duration.fixed.seconds}s`
                        : scenarioPopout.load_profile.duration.iterations
                          ? `${scenarioPopout.load_profile.duration.iterations.count} iters`
                          : scenarioPopout.load_profile.duration.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Load Pattern</p>
                    <p className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>{scenarioPopout.load_profile.pattern.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Steps</p>
                    <p className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>{scenarioPopout.steps.length}</p>
                  </div>
                </div>

                {/* Steps summary */}
                {scenarioPopout.steps.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Step Details</p>
                    <div className="space-y-1.5">
                      {scenarioPopout.steps.map((step, i) => (
                        <div key={step.id || i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md" style={{ background: 'var(--rm-bg-card)' }}>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>
                            {step.config.step_type === 'rest' ? step.config.rest?.method ?? 'GET' : step.config.step_type === 'graphql' ? 'GQL' : 'WEB'}
                          </span>
                          <span className="text-[11px] truncate flex-1" style={{ color: 'var(--rm-text-secondary)' }}>
                            {step.name || (step.config.step_type === 'rest' ? step.config.rest?.path : step.config.step_type === 'graphql' ? step.config.graphql?.operation_name : step.config.browser?.url) || `Step ${i + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {scenarioPopout.metadata.tags.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {scenarioPopout.metadata.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--rm-border)', color: 'var(--rm-text-secondary)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Owner */}
                {scenarioPopout.metadata.owner && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--rm-text-muted)' }}>Owner</p>
                    <p className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>{scenarioPopout.metadata.owner}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}
