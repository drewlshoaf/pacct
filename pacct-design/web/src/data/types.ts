export type RunStatus = 'completed' | 'running' | 'failed';
export type EventType = 'ramp' | 'saturation' | 'error-spike' | 'recovery' | 'threshold-breach' | 'stabilization';
export type EventSeverity = 'info' | 'warning' | 'critical';

export interface Run {
  id: string;
  name: string;
  scenarioName?: string;
  scenarioType?: string;
  planName: string;
  environment: string;
  environmentUrl?: string;
  status: RunStatus;
  stabilityScore: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  scenarioCount: number;
  peakConcurrency: number;
  policyMode?: string;
  stepType?: string;
  loadPattern?: string;
}

export interface RunListResponse {
  runs: Run[];
  total: number;
  limit: number;
  offset: number;
}

export interface MetricPoint {
  timestamp: number; // seconds from start
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  throughput: number;
  errorRate: number;
  concurrency: number;
  timeoutRate?: number;
  bytesReceived?: number;
  bytesSent?: number;
}

export interface RunEvent {
  id: string;
  bucket: number; // 1-based bucket index
  timestamp: number; // seconds from start
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  link?: { href: string; label: string };
}

export interface Scorecard {
  overallScore: number;
  categories: {
    name: string;
    score: number;
    weight: number;
  }[];
  penalties: {
    reason: string;
    amount: number;
  }[];
}

export interface AiAnalysis {
  primaryFinding: string;
  secondaryObservations: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    summary: string;
  };
  recommendations: {
    text: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  confidence: number; // 0-100
  evidenceLinks: {
    label: string;
    eventId: string;
    metric?: string;
    timestamp?: number;
  }[];
  testGoalMet: boolean;
  actionRequired: boolean;
  decisionSpine: {
    basis: string;
    evidencePointers: string[];
  }[];
  mostLikelyConstraint?: string;
  mostLikelyConstraintEvidence?: string[];
}

export interface RunDetail {
  run: Run;
  metrics: MetricPoint[];
  events: RunEvent[];
  scorecard: Scorecard;
  aiAnalysis: AiAnalysis;
}

// ─── Plan Run types (for plan-centric runs view) ─────────────────────

export interface PlanRunScenarioSummary {
  name: string;
  run_id: string | null;
  status: string;
  score: number | null;
  decision: string | null;
}

export interface PlanRunListItem {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  triggered_by: string;
  total_scenarios: number;
  completed_scenarios: number;
  failed_scenarios: number;
  aggregate_score: number | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  scenario_names: string[];
  scenarios: PlanRunScenarioSummary[];
}

export interface PlanRunListResponse {
  plan_runs: PlanRunListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlanRunScenarioDetail {
  id: string;
  scenario_id: string;
  run_id: string | null;
  index: number;
  status: string;
  scenario_name: string | null;
  score: number | null;
  decision: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error: string | null;
}

export interface PlanRunDetail {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  triggered_by: string;
  total_scenarios: number;
  completed_scenarios: number;
  failed_scenarios: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  scenarios: PlanRunScenarioDetail[];
}

// ─── Dashboard & Analytics types ──────────────────────────────────────

export type IssueSortMode = 'recent' | 'severity';
export type AnalyticsScope = 'global' | 'scenario';
export type TimeWindow = '24h' | '7d' | '30d';

export interface LivePlanRun {
  id: string;
  plan_id: string;
  plan_name: string;
  status: 'running' | 'queued';
  started_at: string | null;
  environment_name: string | null;
  total_scenarios: number;
  completed_scenarios: number;
  failed_scenarios: number;
  current_scenario_name: string | null;
}

export interface IssueOccurrence {
  plan_run_id: string;
  plan_name: string;
  scenario_name: string;
  scenario_id: string;
  timestamp: string;
  detail: string;
}

export interface IssueSignature {
  key: string;
  scenario_id: string;
  scenario_name: string;
  failure_type: 'run_failed' | 'error' | 'p95' | 'stability' | 'gate_failed';
  primary_line: string;
  occurrence_count: number;
  plan_names: string[];
  most_recent_at: string;
  occurrences: IssueOccurrence[];
}

export interface DashboardGateResult {
  gate_id: string;
  gate_name: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  status: 'passed' | 'failed' | 'not_evaluated';
  failed_conditions: string[];
  last_evaluated_at: string;
}

export interface DashboardGateStatus {
  passed_count: number;
  failed_count: number;
  not_evaluated_count: number;
  failed_gates: DashboardGateResult[];
  all_gates: DashboardGateResult[];
}

export interface DashboardData {
  live: LivePlanRun[];
  has_more_live: boolean;
  gates: DashboardGateStatus;
  issues: IssueSignature[];
}
