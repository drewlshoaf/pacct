/**
 * Canonical types for the scenario-centric Analytics page.
 *
 * These match the API response shape from GET /api/analytics/scenario/[id]
 * (backed by getScenarioAnalytics in @loadtoad/db).
 *
 * All analytics components import types from this file.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type BaselineMode = 'prev' | 'last5' | 'last10';
export type AnomalySeverity = 'high' | 'medium' | 'low';
export type StabilityStatus =
  | 'stable'
  | 'mildly_unstable'
  | 'highly_variable'
  | 'worsening';

// ---------------------------------------------------------------------------
// Executive Summary
// ---------------------------------------------------------------------------

export interface ExecutiveSummary {
  latest_run_status: string;
  anomaly_status: string;
  anomaly_count: number;
  largest_regression: { metric: string; percent_delta: number } | null;
  largest_improvement: { metric: string; percent_delta: number } | null;
  gate_summary: { passed: number; failed: number };
  run_count: number;
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

export interface AnomalyFinding {
  metric: string;
  current: number;
  baseline: number;
  delta: number;
  percent_delta: number;
  severity: AnomalySeverity;
}

// ---------------------------------------------------------------------------
// Run-to-Run Comparison
// ---------------------------------------------------------------------------

export interface MetricComparison {
  metric: string;
  current: number;
  comparison: number;
  delta: number;
  percent_delta: number;
  anomaly: boolean;
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export interface TrendPoint {
  run_id: string;
  created_at: string;
  value: number;
}

export interface TrendData {
  throughput: TrendPoint[];
  p50: TrendPoint[];
  p95: TrendPoint[];
  p99: TrendPoint[];
  error_rate: TrendPoint[];
  timeout_rate: TrendPoint[];
  bytes_received: TrendPoint[];
  bytes_sent: TrendPoint[];
  duration: TrendPoint[];
}

// ---------------------------------------------------------------------------
// Variance / Stability
// ---------------------------------------------------------------------------

export interface VariancePanel {
  label: string;
  status: StabilityStatus;
  coefficient_of_variation: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Gate Analytics
// ---------------------------------------------------------------------------

export interface GateTrendPoint {
  run_id: string;
  created_at: string;
  passed: number;
  failed: number;
}

export interface GateFailureEntry {
  gate_id: string;
  gate_name: string;
  fail_count: number;
  last_failed: string;
}

export interface GateAnalyticsData {
  trend: GateTrendPoint[];
  most_failing: GateFailureEntry[];
  newly_failing: GateFailureEntry[];
}

// ---------------------------------------------------------------------------
// Notable Runs
// ---------------------------------------------------------------------------

export interface NotableRun {
  run_id: string;
  created_at: string;
  status: string;
  category: string;
  label: string;
  value: number | string;
}

// ---------------------------------------------------------------------------
// Full Response
// ---------------------------------------------------------------------------

export interface ScenarioAnalyticsResponse {
  scenario_id: string;
  scenario_name: string;
  baseline_mode: BaselineMode;
  run_count: number;
  executive_summary: ExecutiveSummary;
  anomalies: AnomalyFinding[];
  comparison: MetricComparison[];
  trends: TrendData;
  variance: VariancePanel[];
  gates: GateAnalyticsData;
  notable_runs: NotableRun[];
  insights: string[];
}
