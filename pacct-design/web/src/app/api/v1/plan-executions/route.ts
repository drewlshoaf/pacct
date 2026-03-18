import { withApiAuth } from "@/lib/api-v1/middleware";
import { paginated } from "@/lib/api-v1/response";
import { parsePaginationParams, encodeCursor } from "@/lib/api-v1/pagination";

export const dynamic = "force-dynamic";

/** GET /api/v1/plan-executions — List plan executions, paginated. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const { limit } = parsePaginationParams(url.searchParams);

  const status = url.searchParams.get("status") || undefined;
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { listAllPlanRuns } = await import("@loadtoad/db");
  const result = await listAllPlanRuns({ limit: limit + 1, offset, status });

  const hasMore = result.plan_runs.length > limit;
  const data = hasMore ? result.plan_runs.slice(0, limit) : result.plan_runs;

  // Map to customer API format
  const mapped = data.map((pr) => ({
    id: pr.id,
    plan_id: pr.plan_id ?? null,
    plan_name: pr.plan_name,
    status: pr.status,
    triggered_by: pr.triggered_by,
    total_scenarios: pr.total_scenarios,
    completed_scenarios: pr.completed_scenarios,
    failed_scenarios: pr.failed_scenarios,
    started_at: pr.started_at,
    completed_at: pr.completed_at,
    created_at: pr.created_at,
  }));

  const lastItem = mapped[mapped.length - 1];
  const cursor = hasMore && lastItem
    ? encodeCursor({ id: String(lastItem.id), created_at: String(lastItem.created_at) })
    : null;

  return paginated(mapped, { cursor, has_more: hasMore, total: result.total });
});
