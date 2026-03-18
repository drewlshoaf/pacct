/**
 * Client-side data fetchers for the Runtime Max portal.
 *
 * These call the Next.js API routes which read from the artifact pipeline.
 * Falls back gracefully on errors so pages can show empty states.
 */

import type { Run, RunDetail, RunListResponse, PlanRunListItem, PlanRunListResponse, PlanRunDetail } from "@/data/types";

export interface FetchRunsParams {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: string;
  search?: string;
  decision?: string;
  policyMode?: string;
  dateFrom?: string;
  dateTo?: string;
}

const EMPTY_LIST: RunListResponse = { runs: [], total: 0, limit: 25, offset: 0 };

export async function fetchRuns(params?: FetchRunsParams): Promise<RunListResponse> {
  try {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== "") qs.set(k, String(v));
      }
    }
    const url = `/api/runs${qs.toString() ? `?${qs}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return EMPTY_LIST;
    return await res.json();
  } catch {
    return EMPTY_LIST;
  }
}

export async function fetchRunDetail(
  id: string,
  scenario?: number
): Promise<RunDetail | null> {
  try {
    const url = scenario != null ? `/api/runs/${id}?scenario=${scenario}` : `/api/runs/${id}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteRun(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/runs/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Scenario longitudinal analytics
// ---------------------------------------------------------------------------

export interface ScenarioNameEntry {
  id: string;
  name: string;
  run_count: number;
  latest_run: string;
}

export interface ScenarioRunDataPoint {
  run_id: string;
  created_at: string;
  stability_score: number;
  stability_band: string;
  decision: string;
  overall_score: number;
  duration_seconds: number;
  avg_p50: number;
  avg_p95: number;
  avg_throughput: number;
  peak_throughput: number;
  avg_error_rate: number;
  total_requests: number;
  total_errors: number;
  bucket_count: number;
}

export async function fetchScenarioNames(): Promise<ScenarioNameEntry[]> {
  try {
    const res = await fetch("/api/analytics/scenarios");
    if (!res.ok) return [];
    const data = await res.json();
    return data.scenarios ?? [];
  } catch {
    return [];
  }
}

export async function fetchScenarioLongitudinal(
  name: string,
  limit?: number,
): Promise<ScenarioRunDataPoint[]> {
  try {
    const qs = new URLSearchParams({ name });
    if (limit) qs.set("limit", String(limit));
    const res = await fetch(`/api/analytics/scenarios?${qs}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.dataPoints ?? [];
  } catch {
    return [];
  }
}

// ─── Environments ─────────────────────────────────────────────────────

export interface EnvironmentEntry {
  id: string;
  name: string;
  base_url: string;
  type: string;
  description: string;
  is_default: boolean;
  verified: boolean;
  verification_token: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchEnvironments(): Promise<EnvironmentEntry[]> {
  try {
    const res = await fetch("/api/environments");
    if (!res.ok) return [];
    const data = await res.json();
    return data.environments ?? [];
  } catch {
    return [];
  }
}

// ─── Plan Runs ────────────────────────────────────────────────────────

export async function fetchPlanRun(planRunId: string): Promise<PlanRunDetail | null> {
  try {
    const res = await fetch(`/api/plan-runs/${planRunId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.plan_run ?? null;
  } catch {
    return null;
  }
}

export async function cancelPlanRun(planRunId: string): Promise<void> {
  const res = await fetch(`/api/plan-runs/${planRunId}/cancel`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to cancel plan run");
  }
}

// ─── Plan Runs (global listing for Runs page) ─────────────────────────

const EMPTY_PLAN_RUN_LIST: PlanRunListResponse = { plan_runs: [], total: 0, limit: 25, offset: 0 };

export interface FetchPlanRunsListParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
}

export async function fetchPlanRunsList(params?: FetchPlanRunsListParams): Promise<PlanRunListResponse> {
  try {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== "") qs.set(k, String(v));
      }
    }
    const url = `/api/plan-runs${qs.toString() ? `?${qs}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[fetchPlanRunsList] API error:", res.status, body.error ?? body);
      return EMPTY_PLAN_RUN_LIST;
    }
    return await res.json();
  } catch (err) {
    console.error("[fetchPlanRunsList] fetch failed:", err);
    return EMPTY_PLAN_RUN_LIST;
  }
}

export async function fetchPlanRunDetail(id: string): Promise<PlanRunDetail | null> {
  try {
    const res = await fetch(`/api/plan-runs/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.plan_run ?? null;
  } catch {
    return null;
  }
}

export async function deletePlanRunById(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/plan-runs/${id}`, { method: "DELETE", cache: "no-store" });
    if (!res.ok) {
      console.error("[deletePlanRunById] API error:", res.status, await res.text().catch(() => ""));
    }
    return res.ok;
  } catch (err) {
    console.error("[deletePlanRunById] fetch failed:", err);
    return false;
  }
}

// ─── Plans (CRUD) ─────────────────────────────────────────────────────

import type { Plan, PlanRun } from "@loadtoad/schema";

export interface PlanListItem extends Plan {
  scenario_count: number;
  last_run_at: string | null;
  last_run_status: string | null;
}

export interface PlanListResponse {
  plans: PlanListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface FetchPlansParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: string;
  scheduleType?: string;
}

export interface PlanScenarioInfo {
  id: string;
  name: string;
  type: string;
  step_count: number;
  exists: boolean;
}

export interface PlanDetailResponse {
  plan: Plan;
  recent_runs: PlanRun[];
  scenarios: PlanScenarioInfo[];
}

const EMPTY_PLAN_LIST: PlanListResponse = { plans: [], total: 0, limit: 50, offset: 0 };

export async function fetchPlans(params?: FetchPlansParams): Promise<PlanListResponse> {
  try {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== "") qs.set(k, String(v));
      }
    }
    const url = `/api/plans${qs.toString() ? `?${qs}` : ""}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return EMPTY_PLAN_LIST;
    return await res.json();
  } catch {
    return EMPTY_PLAN_LIST;
  }
}

export async function fetchPlanDetail(id: string): Promise<PlanDetailResponse | null> {
  try {
    const res = await fetch(`/api/plans/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createPlan(plan: Plan): Promise<Plan | null> {
  try {
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updatePlan(id: string, plan: Plan): Promise<Plan | null> {
  try {
    const res = await fetch(`/api/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deletePlanById(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runPlan(id: string): Promise<{ plan_run_id: string; status: string } | null> {
  try {
    const res = await fetch(`/api/plans/${id}/run`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to run plan");
    }
    return await res.json();
  } catch (err) {
    console.error("[runPlan] failed:", err);
    return null;
  }
}

export async function pausePlan(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/plans/${id}/pause`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resumePlan(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/plans/${id}/resume`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────

import type { DashboardData, TimeWindow } from "@/data/types";

const EMPTY_DASHBOARD: DashboardData = {
  live: [],
  has_more_live: false,
  gates: { passed_count: 0, failed_count: 0, not_evaluated_count: 0, failed_gates: [], all_gates: [] },
  issues: [],
};

export async function fetchDashboardData(window?: TimeWindow): Promise<DashboardData> {
  try {
    const qs = window ? `?window=${window}` : "";
    const res = await fetch(`/api/dashboard${qs}`);
    if (!res.ok) return EMPTY_DASHBOARD;
    return await res.json();
  } catch {
    return EMPTY_DASHBOARD;
  }
}

// ─── Analytics ────────────────────────────────────────────────────────

export interface GlobalAnalytics {
  global_stability: number | null;
  stability_over_time: Array<{ date: string; stability: number }>;
  recent_plan_runs: Array<{
    id: string;
    plan_name: string;
    stability: number | null;
    completed_at: string | null;
    scenario_count: number;
  }>;
}

export async function fetchGlobalAnalytics(
  window: string,
): Promise<GlobalAnalytics> {
  try {
    const qs = new URLSearchParams({ window });
    const res = await fetch(`/api/analytics/global?${qs}`);
    if (!res.ok) return { global_stability: null, stability_over_time: [], recent_plan_runs: [] };
    return await res.json();
  } catch {
    return { global_stability: null, stability_over_time: [], recent_plan_runs: [] };
  }
}

export interface EvidenceResult {
  type: string;
  p95_over_time?: Array<{ time: string; value: number }>;
  latency_distribution?: Array<{ bucket_ms: string; count: number }>;
  error_rate_over_time?: Array<{ time: string; rate: number; requests: number; errors: number }>;
  error_breakdown?: { total_errors: number; total_requests: number };
  stability_score?: number | null;
  penalties?: Array<{ reason: string; amount: number }>;
  failure_reason?: string | null;
  stop_time?: string | null;
}

export async function fetchEvidenceData(opts: {
  runId?: string;
  planRunId?: string;
  scenarioId?: string;
  type: string;
}): Promise<EvidenceResult> {
  try {
    const qs = new URLSearchParams({ type: opts.type });
    if (opts.runId) qs.set("runId", opts.runId);
    if (opts.planRunId) qs.set("planRunId", opts.planRunId);
    if (opts.scenarioId) qs.set("scenarioId", opts.scenarioId);
    const res = await fetch(`/api/analytics/evidence?${qs}`);
    if (!res.ok) return { type: "run_failed", failure_reason: "Failed to fetch", stop_time: null };
    return await res.json();
  } catch {
    return { type: "run_failed", failure_reason: "Network error", stop_time: null };
  }
}

// ─── Scenario Analytics (v2 — executive summary + anomaly detection) ─────

export interface ScenarioAnalyticsResponse {
  scenario_name: string;
  run_count_in_window: number;

  latest_run: {
    run_id: string;
    status: string;
    decision: string;
    date: string;
    score: number | null;
  } | null;

  stability_status: 'stable' | 'mildly_unstable' | 'highly_variable' | 'deteriorating';

  largest_regression: {
    metric: string;
    delta_pct: number;
  } | null;

  largest_improvement: {
    metric: string;
    delta_pct: number;
  } | null;

  gates: {
    passed: number;
    failed: number;
    total: number;
  };

  anomalies: Array<{
    metric: string;
    current: number;
    baseline: number;
    delta: number;
    delta_pct: number;
    severity: 'high' | 'medium' | 'low';
    trend: 'rising' | 'falling' | 'stable';
  }>;
}

export interface ScenarioSummary {
  scenario_name: string;
  assertions: Array<{ metric: string; operator: string; threshold: number; unit: string }>;
  latest_run_status: string;
  p95_trend: Array<{ date: string; value: number }>;
  error_rate_trend: Array<{ date: string; value: number }>;
  stability_trend: Array<{ date: string; value: number }> | null;
  run_list: Array<{
    run_id: string | null;
    plan_run_id: string;
    date: string | null;
    status: string;
    stability: number | null;
    error: string | null;
  }>;
}

export async function fetchScenarioSummary(
  scenarioId: string,
  window: string,
): Promise<ScenarioSummary | null> {
  try {
    const qs = new URLSearchParams({ scenarioId, window });
    const res = await fetch(`/api/analytics/scenario-summary?${qs}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
