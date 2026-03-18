import { withApiAuth } from "@/lib/api-v1/middleware";
import { paginated } from "@/lib/api-v1/response";

export const dynamic = "force-dynamic";

/** GET /api/v1/gate-results — List gate results. Supports run_id, gate_id, result filters. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 20), 100);
  const cursor = url.searchParams.get("cursor") || undefined;
  const run_id = url.searchParams.get("run_id") || undefined;
  const gate_id = url.searchParams.get("gate_id") || undefined;
  const rawResult = url.searchParams.get("result");
  const result = rawResult === "pass" || rawResult === "fail" ? rawResult : undefined;

  const { listGateResults } = await import("@loadtoad/db");
  const page = await listGateResults({ limit, cursor, run_id, gate_id, result });

  return paginated(page.data, {
    cursor: page.cursor,
    has_more: page.has_more,
    total: page.data.length,
  });
});
