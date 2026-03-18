import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";

export const dynamic = "force-dynamic";

/** POST /api/v1/runs/:id/cancel — Cancel a queued/running test. */
export const POST = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!;

  const { getRedisConnection } = await import("@loadtoad/queue");
  const redis = getRedisConnection();
  await redis.setex(`sv:run:abort:${id}`, 3600, "Canceled via API");

  return ok({ status: "canceled" });
});
