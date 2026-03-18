'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { fetchScenarioNames, fetchPlanDetail, fetchPlanRunDetail } from '@/lib/api';
import type { ScenarioNameEntry } from '@/lib/api';
import {
  useAnalyticsStore,
  type BaselineMode,
  type AnalyticsWindow,
} from './_store/analyticsStore';
import ExecutiveSummary from '@/components/analytics/ExecutiveSummary';
import AnomalySummary from '@/components/analytics/AnomalySummary';
import RunComparison from '@/components/analytics/RunComparison';
import DeltaBarChart from '@/components/analytics/DeltaBarChart';
import TrendSection from '@/components/analytics/TrendSection';
import StabilitySection from '@/components/analytics/StabilitySection';
import LatencyBoxPlot from '@/components/analytics/LatencyBoxPlot';
import GateAnalytics from '@/components/analytics/GateAnalytics';
import NotableRuns from '@/components/analytics/NotableRuns';
import EventRail from '@/components/analytics/EventRail';
import InsightsPanel from '@/components/analytics/InsightsPanel';
import CorrelationScatter from '@/components/analytics/CorrelationScatter';

// ─── Segmented Control ──────────────────────────────────────────────────

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex gap-0.5 p-0.5 rounded-lg"
      style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors"
            style={{
              background: active ? 'var(--rm-bg-surface)' : 'transparent',
              color: active ? 'var(--rm-text)' : 'var(--rm-text-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Searchable Scenario Selector ───────────────────────────────────────

function ScenarioSelector({
  scenarios,
  selectedId,
  onSelect,
}: {
  scenarios: ScenarioNameEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return scenarios;
    const lower = search.toLowerCase();
    return scenarios.filter((s) => s.name.toLowerCase().includes(lower));
  }, [scenarios, search]);

  const selectedName = useMemo(
    () => scenarios.find((s) => s.id === selectedId)?.name ?? null,
    [scenarios, selectedId],
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative" style={{ minWidth: 240 }}>
      <label
        className="text-[11px] font-semibold uppercase tracking-wide block mb-1"
        style={{ color: 'var(--rm-text-muted)' }}
      >
        Scenario
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left text-[13px] px-3 py-1.5 rounded-lg truncate"
        style={{
          background: 'var(--rm-bg-raised)',
          color: selectedName ? 'var(--rm-text)' : 'var(--rm-text-muted)',
          border: '1px solid var(--rm-border)',
        }}
      >
        {selectedName || 'Select a scenario…'}
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg shadow-lg overflow-hidden"
          style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}
        >
          <div className="p-2" style={{ borderBottom: '1px solid var(--rm-border)' }}>
            <input
              type="text"
              placeholder="Search scenarios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full text-[13px] px-2.5 py-1.5 rounded-md"
              style={{
                background: 'var(--rm-bg-raised)',
                color: 'var(--rm-text)',
                border: '1px solid var(--rm-border)',
                outline: 'none',
              }}
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-[13px] text-center" style={{ color: 'var(--rm-text-muted)' }}>
                No scenarios found
              </div>
            )}
            {filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelect(s.id);
                  setSearch('');
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-[var(--rm-bg-raised)]"
                style={{
                  color: s.id === selectedId ? 'var(--rm-signal)' : 'var(--rm-text)',
                  borderBottom: '1px solid var(--rm-border)',
                }}
              >
                {s.name}
                <span className="text-[11px] ml-2" style={{ color: 'var(--rm-text-muted)' }}>
                  ({s.run_count} runs)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Baseline + Window Options ──────────────────────────────────────────

const baselineOptions: { value: BaselineMode; label: string }[] = [
  { value: 'prev', label: 'Previous Run' },
  { value: 'last5', label: 'Last 5' },
  { value: 'last10', label: 'Last 10' },
];

const windowOptions: { value: AnalyticsWindow; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

// ─── Page ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const {
    scenarioId,
    baselineMode,
    window: analyticsWindow,
    data,
    loading,
    setScenarioId,
    setBaselineMode,
    setWindow,
  } = useAnalyticsStore();

  const [scenarios, setScenarios] = useState<ScenarioNameEntry[]>([]);
  const appliedParamsRef = useRef(false);

  useEffect(() => {
    fetchScenarioNames().then(setScenarios);
  }, []);

  // Handle URL params: ?scenario_id=... or ?plan_id=...
  const resolvePlanToScenario = useCallback(async (planId: string) => {
    const detail = await fetchPlanDetail(planId);
    if (!detail?.recent_runs?.length) {
      // Fallback: use the first scenario from the plan
      if (detail?.scenarios?.length) setScenarioId(detail.scenarios[0].id);
      return;
    }
    // Find the most recent completed/failed run
    const latestRun = detail.recent_runs[0];
    const runDetail = await fetchPlanRunDetail(latestRun.id);
    if (runDetail?.scenarios?.length) {
      // Find the first failed scenario, or fall back to the first one
      const failed = runDetail.scenarios.find((s) => s.status === 'failed');
      setScenarioId(failed?.scenario_id ?? runDetail.scenarios[0].scenario_id);
    } else if (detail.scenarios?.length) {
      setScenarioId(detail.scenarios[0].id);
    }
  }, [setScenarioId]);

  useEffect(() => {
    if (appliedParamsRef.current) return;
    const scenarioParam = searchParams.get('scenario_id');
    const planParam = searchParams.get('plan_id');
    if (scenarioParam) {
      appliedParamsRef.current = true;
      setScenarioId(scenarioParam);
    } else if (planParam) {
      appliedParamsRef.current = true;
      resolvePlanToScenario(planParam);
    }
  }, [searchParams, setScenarioId, resolvePlanToScenario]);

  const noScenario = !scenarioId;
  const noRuns = !loading && data !== null && data.run_count === 0;

  return (
    <PortalLayout>
      <PageHeader
        title="Analytics"
        description="Scenario-centered analysis workspace"
      />

      {/* ── Control Bar ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-end gap-4 mb-6"
        style={{
          background: 'var(--rm-bg-surface)',
          border: '1px solid var(--rm-border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <ScenarioSelector
          scenarios={scenarios}
          selectedId={scenarioId}
          onSelect={setScenarioId}
        />

        <div>
          <label
            className="text-[11px] font-semibold uppercase tracking-wide block mb-1"
            style={{ color: 'var(--rm-text-muted)' }}
          >
            Baseline
          </label>
          <SegmentedControl
            options={baselineOptions}
            value={baselineMode}
            onChange={setBaselineMode}
          />
        </div>

        <div>
          <label
            className="text-[11px] font-semibold uppercase tracking-wide block mb-1"
            style={{ color: 'var(--rm-text-muted)' }}
          >
            Window
          </label>
          <SegmentedControl
            options={windowOptions}
            value={analyticsWindow}
            onChange={setWindow}
          />
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && (
        <div
          className="text-center py-16"
          style={{
            background: 'var(--rm-bg-surface)',
            border: '1px solid var(--rm-border)',
            borderRadius: 12,
            padding: '20px 24px',
          }}
        >
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>
            Loading scenario analytics...
          </p>
        </div>
      )}

      {/* ── Empty: no scenario selected ──────────────────────────────────── */}
      {noScenario && !loading && (
        <div
          className="text-center py-16"
          style={{
            background: 'var(--rm-bg-surface)',
            border: '1px solid var(--rm-border)',
            borderRadius: 12,
            padding: '20px 24px',
          }}
        >
          <p className="text-[15px] font-medium mb-2" style={{ color: 'var(--rm-text)' }}>
            No scenario selected
          </p>
          <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>
            Select a scenario to analyze run history, compare recent executions, and identify anomalies.
          </p>
        </div>
      )}

      {/* ── Empty: no run history ────────────────────────────────────────── */}
      {noRuns && (
        <div
          className="text-center py-16"
          style={{
            background: 'var(--rm-bg-surface)',
            border: '1px solid var(--rm-border)',
            borderRadius: 12,
            padding: '20px 24px',
          }}
        >
          <p className="text-[15px] font-medium mb-2" style={{ color: 'var(--rm-text)' }}>
            No run history
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>
            This scenario does not yet have enough run history for comparison analytics.
          </p>
          <a
            href="/dashboard/scenarios"
            className="inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'var(--rm-signal)',
              color: '#fff',
            }}
          >
            Run Scenario
          </a>
        </div>
      )}

      {/* ── Analytics panels ─────────────────────────────────────────────── */}
      {!loading && data && data.run_count > 0 && (
        <div className="space-y-5">
          <ExecutiveSummary data={data} />
          <AnomalySummary data={data} />
          <EventRail data={data} />
          <RunComparison data={data} />
          <DeltaBarChart data={data} />
          <TrendSection data={data} />
          <StabilitySection data={data} />
          <LatencyBoxPlot data={data} />
          <GateAnalytics data={data} />
          <NotableRuns data={data} />
          <InsightsPanel data={data} />
          <CorrelationScatter data={data} />
        </div>
      )}
    </PortalLayout>
  );
}
