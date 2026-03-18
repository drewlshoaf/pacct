import { withApiAuth } from "@/lib/api-v1/middleware";
import { paginated } from "@/lib/api-v1/response";
import { notFoundError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/plan-executions/:id/runs — List child runs for this plan execution. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const runsIdx = segments.lastIndexOf("runs");
  const id = segments[runsIdx - 1];

  const { getEnrichedPlanRun } = await import("@loadtoad/db");
  const planRun = await getEnrichedPlanRun(id);
  if (!planRun) return notFoundError("Plan execution");

  const runs = planRun.scenarios.map((s) => ({
    run_id: s.run_id,
    scenario_id: s.scenario_id,
    scenario_name: s.scenario_name,
    index: s.index,
    status: s.status,
    score: s.score,
    decision: s.decision,
    started_at: s.started_at,
    completed_at: s.completed_at,
    duration_seconds: s.duration_seconds,
    error: s.error,
  }));

  return paginated(runs, { cursor: null, has_more: false, total: runs.length });
});
