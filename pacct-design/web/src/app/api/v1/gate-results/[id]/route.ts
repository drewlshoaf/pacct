import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";
import { notFoundError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/gate-results/:id — Single gate result detail. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1)!;

  const { getGateResult } = await import("@loadtoad/db");
  const result = await getGateResult(id);
  if (!result) return notFoundError("Gate result");

  return ok(result);
});
