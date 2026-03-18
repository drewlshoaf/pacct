import { withApiAuth } from "@/lib/api-v1/middleware";
import { paginated } from "@/lib/api-v1/response";
import { parsePaginationParams, encodeCursor } from "@/lib/api-v1/pagination";

export const dynamic = "force-dynamic";

/** GET /api/v1/runs — List runs, paginated. Supports status and scenario_id filters. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const { limit, cursor, sort, order } = parsePaginationParams(url.searchParams);

  const status = url.searchParams.get("status") || undefined;
  const scenarioId = url.searchParams.get("scenario_id") || undefined;

  const { listRunsV1 } = await import("@/lib/api-v1/queries/runs");
  const { rows, total } = await listRunsV1({ limit, cursor, sort, order, status, scenarioId });

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && data.length > 0
    ? encodeCursor({ id: data[data.length - 1].id, created_at: data[data.length - 1].created_at })
    : null;

  return paginated(data, { cursor: nextCursor, has_more: hasMore, total });
});
