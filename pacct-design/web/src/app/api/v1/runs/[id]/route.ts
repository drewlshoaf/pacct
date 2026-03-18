import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";
import { notFoundError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/runs/:id — Run detail with metrics_summary if completed. */
export const GET = withApiAuth(async (_request, _ctx) => {
  const url = new URL(_request.url);
  const id = url.pathname.split("/").at(-1)!;

  const { getRunDetail } = await import("@/lib/api-v1/queries/runs");
  const run = await getRunDetail(id);
  if (!run) return notFoundError("Run");

  return ok(run);
});
