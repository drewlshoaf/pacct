import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";
import { notFoundError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/plan-executions/:id — Plan execution detail with child run summaries. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1)!;

  const { getEnrichedPlanRun } = await import("@loadtoad/db");
  const planRun = await getEnrichedPlanRun(id);
  if (!planRun) return notFoundError("Plan execution");

  return ok({
    id: planRun.id,
    plan_id: planRun.plan_id,
    plan_name: planRun.plan_name,
    status: planRun.status,
    triggered_by: planRun.triggered_by,
    total_scenarios: planRun.total_scenarios,
    completed_scenarios: planRun.completed_scenarios,
    failed_scenarios: planRun.failed_scenarios,
    started_at: planRun.started_at,
    completed_at: planRun.completed_at,
    runs: planRun.scenarios.map((s) => ({
      run_id: s.run_id,
      scenario_name: s.scenario_name,
      status: s.status,
      score: s.score,
      decision: s.decision,
      started_at: s.started_at,
      completed_at: s.completed_at,
      duration_seconds: s.duration_seconds,
    })),
  });
});
