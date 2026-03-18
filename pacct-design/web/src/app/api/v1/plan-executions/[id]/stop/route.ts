import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";

export const dynamic = "force-dynamic";

/** POST /api/v1/plan-executions/:id/stop — Stop a running plan execution. */
export const POST = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const stopIdx = segments.lastIndexOf("stop");
  const id = segments[stopIdx - 1];

  const { getRedisConnection } = await import("@loadtoad/queue");
  const redis = getRedisConnection();
  await redis.set(`sv:plan-run:cancelled:${id}`, "1", "EX", 3600);

  return ok({ status: "stopped" });
});
