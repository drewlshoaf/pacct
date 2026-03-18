import type { CursorPayload } from "../pagination";

/**
 * Shared query helpers for /api/v1/runs endpoints.
 * Delegates to @loadtoad/db — does NOT duplicate business logic.
 */

export interface ListRunsV1Opts {
  limit: number;
  cursor: CursorPayload | null;
  sort: string;
  order: "asc" | "desc";
  status?: string;
  scenarioId?: string;
}

export interface RunListRow {
  id: string;
  created_at: string;
  scenario_id: string | null;
  scenario_name: string | null;
  status: string;
  decision: string;
  duration_seconds: number;
  overall_score: number;
  completed_at: string | null;
  metrics_summary: {
    total_requests: number;
    avg_rps: number;
    p95_latency_ms: number;
    error_rate: number;
  } | null;
}

export async function listRunsV1(opts: ListRunsV1Opts): Promise<{ rows: RunListRow[]; total: number }> {
  const { getClient } = await import("@loadtoad/db");
  const sql = getClient();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 0;

  // Cursor-based pagination
  if (opts.cursor) {
    const op = opts.order === "asc" ? ">" : "<";
    paramIdx++;
    conditions.push(`r.created_at ${op} $${paramIdx}::timestamptz`);
    params.push(opts.cursor.created_at);
  }

  // Status filter — map to decision column
  if (opts.status) {
    paramIdx++;
    conditions.push(`r.decision = $${paramIdx}`);
    params.push(opts.status.toUpperCase());
  }

  // scenario_id pre-filter
  if (opts.scenarioId) {
    paramIdx++;
    conditions.push(`r.id IN (SELECT run_id FROM plan_run_scenarios WHERE scenario_id = $${paramIdx}::uuid AND run_id IS NOT NULL)`);
    params.push(opts.scenarioId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderDir = opts.order === "asc" ? "ASC" : "DESC";

  // Total count
  const countRows = await sql.unsafe(
    `SELECT count(*)::int AS total FROM runs r ${where}`,
    params as never[],
  );
  const total = countRows[0]?.total ?? 0;

  // Fetch limit+1 to detect has_more
  const rawRows = await sql.unsafe(
    `SELECT r.*, rs_name.scenario_name
     FROM runs r
     LEFT JOIN LATERAL (
       SELECT min(rs.name) AS scenario_name
       FROM run_scenarios rs WHERE rs.run_id = r.id
     ) rs_name ON true
     ${where}
     ORDER BY r.created_at ${orderDir}
     LIMIT ${opts.limit + 1}`,
    params as never[],
  );

  const rows: RunListRow[] = rawRows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    created_at: new Date(r.created_at as string | Date).toISOString(),
    scenario_id: null,
    scenario_name: (r.scenario_name as string) ?? null,
    status: deriveStatus(r.decision as string),
    decision: r.decision as string,
    duration_seconds: r.duration_seconds as number,
    overall_score: r.overall_score as number,
    completed_at: null,
    metrics_summary: null,
  }));

  return { rows, total };
}

export async function getRunDetail(id: string) {
  const { getRunArtifact, getRunMetricsSummary } = await import("@loadtoad/db");

  const artifact = await getRunArtifact(id);
  if (!artifact) return null;

  // Build metrics summary from DB
  let metricsSummary = null;
  try {
    const summary = await getRunMetricsSummary(id, 0);
    if (summary && summary.total_requests) {
      const totalRequests = Number(summary.total_requests);
      const totalErrors = Number(summary.total_errors);
      metricsSummary = {
        total_requests: totalRequests,
        avg_rps: Math.round(Number(summary.avg_throughput) * 10) / 10,
        p95_latency_ms: Math.round(Number(summary.avg_p95) * 10) / 10,
        error_rate:
          totalRequests > 0
            ? Math.round((totalErrors / totalRequests) * 10000) / 100
            : 0,
      };
    }
  } catch {
    // Metrics not available
  }

  const scenario = artifact.scenarios[0];
  return {
    id: artifact.id,
    scenario_id: null,
    scenario_name: scenario?.name ?? null,
    status: deriveStatus(artifact.scorecard ? "SCORED" : "completed"),
    decision: artifact.scorecard ? "SCORED" : "UNKNOWN",
    duration_seconds: artifact.duration_seconds,
    overall_score: artifact.scorecard?.overall_score != null
      ? Math.round(artifact.scorecard.overall_score * 100)
      : 0,
    created_at: artifact.created_at,
    completed_at: artifact.duration_seconds
      ? new Date(new Date(artifact.created_at).getTime() + artifact.duration_seconds * 1000).toISOString()
      : null,
    metrics_summary: metricsSummary,
  };
}

function deriveStatus(decision: string): string {
  switch (decision) {
    case "SCORED":
    case "PASS":
      return "completed";
    case "FAIL":
      return "failed";
    default:
      return "completed";
  }
}
