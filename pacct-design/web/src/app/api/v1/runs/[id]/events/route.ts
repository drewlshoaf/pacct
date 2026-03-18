import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";
import { notFoundError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/runs/:id/events — Anomaly events for this run. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!;

  const { getClient, getRunArtifact } = await import("@loadtoad/db");

  // Verify run exists
  const run = await getRunArtifact(id);
  if (!run) return notFoundError("Run");

  const sql = getClient();
  const rows = await sql`
    SELECT time, event_type, severity, metric, value, baseline, change_pct, description
    FROM run_events
    WHERE run_id = ${id} AND scenario_index = 0
    ORDER BY time
  `;

  const events = rows.map((e) => ({
    timestamp: e.time,
    event_type: e.event_type,
    severity: e.severity,
    metric: e.metric,
    value: e.value,
    baseline: e.baseline,
    change_pct: e.change_pct,
    description: e.description,
  }));

  return ok(events);
});
