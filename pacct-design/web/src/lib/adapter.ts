/**
 * Type adapter — maps artifact pipeline types to Runtime Max portal display types.
 *
 * The artifact pipeline uses snake_case types with 0-1 ranges for scores/confidence.
 * The portal uses camelCase types with 0-100 ranges. This module bridges them.
 */

import type {
  RunArtifact,
  ScenarioArtifact,
  ScorecardArtifact,
  StabilityArtifact,
  PerformanceEventArtifact,
  AiBriefing,
  Bucket,
} from "@loadtoad/artifacts";
import type { RunSummary } from "@loadtoad/artifacts";

import type {
  Run,
  RunDetail,
  MetricPoint,
  RunEvent,
  Scorecard,
  AiAnalysis,
  EventType,
  EventSeverity,
} from "@/data/types";

// ---------------------------------------------------------------------------
// Scenario enrichment — optional metadata from the scenario definition
// ---------------------------------------------------------------------------

export interface ScenarioEnrichment {
  stepType?: string;
  loadPattern?: string;
  baseUrl?: string;
  environmentName?: string;
}

// ---------------------------------------------------------------------------
// Run summary (list view)
// ---------------------------------------------------------------------------

export function summaryToRun(s: RunSummary): Run {
  return {
    id: s.id,
    name: s.scenario_name
      ? `${s.scenario_name} — ${s.id.slice(0, 8)}`
      : `Run ${s.id.slice(0, 8)}`,
    scenarioName: s.scenario_name,
    planName: `${s.provider}/${s.model_id}`,
    environment: "evaluation",
    status: "completed",
    stabilityScore: Math.round(s.overall_score * 100),
    startTime: s.created_at,
    endTime: new Date(
      new Date(s.created_at).getTime() + s.duration_seconds * 1000
    ).toISOString(),
    durationSeconds: s.duration_seconds,
    scenarioCount: s.scenario_count,
    peakConcurrency: 0,
    policyMode: s.policy_mode,
  };
}

// ---------------------------------------------------------------------------
// Full artifact → Run (for list views when we have the full artifact)
// ---------------------------------------------------------------------------

export function artifactToRun(a: RunArtifact, scenarioIndex?: number, enrichment?: ScenarioEnrichment): Run {
  const scenario = a.scenarios[scenarioIndex ?? 0];
  const peakConcurrency = scenario
    ? Math.max(...scenario.buckets.map((b) => b.requests))
    : 0;

  return {
    id: a.id,
    name: scenario?.name
      ? `${scenario.name} — ${a.id.slice(0, 8)}`
      : `Run ${a.id.slice(0, 8)}`,
    scenarioName: scenario?.name,
    scenarioType: scenario?.scenario_type,
    planName: `${a.provider}/${a.model_id}`,
    environment: enrichment?.environmentName || "evaluation",
    environmentUrl: enrichment?.baseUrl,
    status: "completed",
    stabilityScore: Math.round(a.scorecard.overall_score * 100),
    startTime: a.created_at,
    endTime: new Date(
      new Date(a.created_at).getTime() + a.duration_seconds * 1000
    ).toISOString(),
    durationSeconds: a.duration_seconds,
    scenarioCount: a.scenarios.length,
    peakConcurrency,
    policyMode: a.policy_mode,
    stepType: enrichment?.stepType,
    loadPattern: enrichment?.loadPattern,
  };
}

// ---------------------------------------------------------------------------
// Buckets → MetricPoints
// ---------------------------------------------------------------------------

export function bucketsToMetrics(
  buckets: Bucket[],
  startTime: string
): MetricPoint[] {
  const start = new Date(startTime).getTime();

  return buckets.map((b) => {
    const bucketTime = new Date(b.timestamp).getTime();
    const secondsFromStart = Math.max(0, (bucketTime - start) / 1000);
    const errorRate =
      b.requests > 0 ? (b.errors / b.requests) * 100 : 0;

    return {
      timestamp: secondsFromStart,
      latencyP50: b.latency.p50,
      latencyP95: b.latency.p95,
      latencyP99: b.latency.p99,
      throughput: b.throughput,
      errorRate,
      concurrency: b.requests,
      timeoutRate: b.timeouts != null && b.requests > 0
        ? (b.timeouts / b.requests) * 100
        : 0,
      bytesReceived: b.bytes_received ?? 0,
      bytesSent: b.bytes_sent ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// Events → RunEvents
// ---------------------------------------------------------------------------

const EVENT_TYPE_MAP: Record<string, EventType> = {
  error_spike: "error-spike",
  latency_spike: "threshold-breach",
  saturation_onset: "saturation",
  degradation_start: "ramp",
  recovery_start: "recovery",
  regression_detected: "threshold-breach",
  tail_blowout: "error-spike",
  variance_anomaly: "stabilization",
};

function mapSeverity(sev: string): EventSeverity {
  if (sev === "critical") return "critical";
  if (sev === "high" || sev === "medium") return "warning";
  return "info";
}

export function artifactEventsToRunEvents(
  events: PerformanceEventArtifact[],
  bucketIntervalSeconds: number
): RunEvent[] {
  return events.map((e, i) => ({
    id: `evt-${i}`,
    bucket: e.bucket_index + 1,
    timestamp: e.bucket_index * bucketIntervalSeconds,
    type: EVENT_TYPE_MAP[e.type] || "stabilization",
    severity: mapSeverity(e.severity),
    title: `${e.type.replace(/_/g, " ")} (${e.severity})`,
    description: e.description,
  }));
}

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

export function artifactScorecardToScorecard(
  sc: ScorecardArtifact,
  stability?: StabilityArtifact
): Scorecard {
  const penalties: { reason: string; amount: number }[] = [];

  if (stability) {
    const p = stability.penalties;
    if (p.error > 0) penalties.push({ reason: "Error penalty", amount: Math.round(p.error * 100) });
    if (p.latency > 0) penalties.push({ reason: "Latency penalty", amount: Math.round(p.latency * 100) });
    if (p.tail > 0) penalties.push({ reason: "Tail latency penalty", amount: Math.round(p.tail * 100) });
    if (p.variance > 0) penalties.push({ reason: "Variance penalty", amount: Math.round(p.variance * 100) });
    if (p.event > 0) penalties.push({ reason: "Event penalty", amount: Math.round(p.event * 100) });
  }

  return {
    overallScore: Math.round(sc.overall_score * 100),
    categories: [
      { name: "Analytics", score: Math.round(sc.analytics_score * 100), weight: 0.5 },
      { name: "AI Quality", score: Math.round(sc.ai_score * 100), weight: 0.5 },
    ],
    penalties,
  };
}

// ---------------------------------------------------------------------------
// AI Briefing → AiAnalysis
// ---------------------------------------------------------------------------

export function briefingToAiAnalysis(
  briefing: AiBriefing,
  events?: PerformanceEventArtifact[],
  bucketIntervalSeconds?: number
): AiAnalysis {
  const evidenceLinks = (briefing.evidence_refs || []).map((ref, i) => ({
    label: ref.text,
    eventId: `ref-${i}`,
    metric: ref.ref_type === "metric" ? ref.ref_id : undefined,
    timestamp:
      ref.bucket_index != null && bucketIntervalSeconds
        ? ref.bucket_index * bucketIntervalSeconds
        : undefined,
  }));

  const recommendations = briefing.recommendations.map((text, i) => ({
    text,
    priority: (i === 0 ? "high" : i <= 2 ? "medium" : "low") as
      | "high"
      | "medium"
      | "low",
  }));

  const decisionSpine: AiAnalysis["decisionSpine"] = [];

  // Build decision spine from primary finding + secondary observations
  if (briefing.primary_finding) {
    decisionSpine.push({
      basis: briefing.primary_finding,
      evidencePointers: briefing.secondary_observations.slice(0, 2),
    });
  }

  if (briefing.recommendations.length > 0) {
    decisionSpine.push({
      basis: briefing.action_required
        ? "Action required based on findings"
        : "No action required",
      evidencePointers: briefing.recommendations.slice(0, 2),
    });
  }

  return {
    primaryFinding: briefing.primary_finding,
    secondaryObservations: briefing.secondary_observations,
    riskAssessment: {
      level: briefing.risk_severity,
      summary: briefing.risk_assessment,
    },
    recommendations,
    confidence: Math.round(briefing.confidence * 100),
    evidenceLinks,
    testGoalMet: briefing.test_goal_met,
    actionRequired: briefing.action_required,
    decisionSpine,
    mostLikelyConstraint: briefing.most_likely_constraint,
    mostLikelyConstraintEvidence: briefing.most_likely_constraint_evidence,
  };
}

// ---------------------------------------------------------------------------
// Full artifact → RunDetail
// ---------------------------------------------------------------------------

/**
 * Convert a full RunArtifact into the portal's RunDetail shape.
 * Picks a single scenario to display (defaults to the first one with the most events).
 */
export function artifactToRunDetail(
  artifact: RunArtifact,
  scenarioIndex?: number,
  enrichment?: ScenarioEnrichment
): RunDetail {
  // Pick the most interesting scenario if not specified
  let idx = scenarioIndex ?? 0;
  if (scenarioIndex == null && artifact.scenarios.length > 1) {
    let maxEvents = 0;
    artifact.scenarios.forEach((s, i) => {
      const count =
        s.events.event_count + s.regressions.regressions.length;
      if (count > maxEvents) {
        maxEvents = count;
        idx = i;
      }
    });
  }

  const scenario = artifact.scenarios[idx];
  if (!scenario) {
    throw new Error(
      `Scenario index ${idx} out of bounds (${artifact.scenarios.length} scenarios)`
    );
  }

  // Compute bucket interval from timestamps
  let bucketInterval = 10; // default 10s
  if (scenario.buckets.length >= 2) {
    const t0 = new Date(scenario.buckets[0].timestamp).getTime();
    const t1 = new Date(scenario.buckets[1].timestamp).getTime();
    bucketInterval = Math.max(1, (t1 - t0) / 1000);
  }

  const run = artifactToRun(artifact, idx, enrichment);
  const metrics = bucketsToMetrics(scenario.buckets, artifact.created_at);
  const events = artifactEventsToRunEvents(
    scenario.events.events,
    bucketInterval
  );
  const scorecard = artifactScorecardToScorecard(
    artifact.scorecard,
    scenario.stability
  );

  // Build AI analysis from briefing if available, fall back to narrative
  let aiAnalysis: AiAnalysis;
  if (scenario.ai_briefing) {
    aiAnalysis = briefingToAiAnalysis(
      scenario.ai_briefing,
      scenario.events.events,
      bucketInterval
    );
  } else if (scenario.narrative) {
    // Fallback: build from narrative response
    aiAnalysis = {
      primaryFinding:
        scenario.narrative.key_findings[0] || "No findings available.",
      secondaryObservations: scenario.narrative.key_findings.slice(1),
      riskAssessment: {
        level: scenario.narrative.ai_briefing?.risk_severity || "low",
        summary:
          scenario.narrative.ai_briefing?.risk_assessment ||
          "No risk assessment available.",
      },
      recommendations: [
        {
          text: scenario.narrative.recommendation,
          priority: "medium",
        },
      ],
      confidence: Math.round(
        (scenario.narrative.ai_briefing?.confidence ?? 0.5) * 100
      ),
      evidenceLinks: [],
      testGoalMet:
        scenario.narrative.ai_briefing?.test_goal_met ?? true,
      actionRequired:
        scenario.narrative.ai_briefing?.action_required ?? false,
      decisionSpine: [],
    };
  } else {
    // No AI data available
    aiAnalysis = {
      primaryFinding: "AI analysis not available for this scenario.",
      secondaryObservations: [],
      riskAssessment: { level: "low", summary: "No data" },
      recommendations: [],
      confidence: 0,
      evidenceLinks: [],
      testGoalMet: true,
      actionRequired: false,
      decisionSpine: [],
    };
  }

  return { run, metrics, events, scorecard, aiAnalysis };
}
