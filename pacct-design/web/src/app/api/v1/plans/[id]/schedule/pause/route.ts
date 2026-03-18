import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";
import { notFoundError, serverError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

function getIdFromUrl(request: Request): string {
  return new URL(request.url).pathname.split("/")[4];
}

/** POST /api/v1/plans/:id/schedule/pause */
export const POST = withApiAuth(async (request, ctx) => {
  try {
    const id = getIdFromUrl(request);
    const { getPlan, upsertPlan } = await import("@loadtoad/db");
    const plan = await getPlan(id);
    if (!plan) return notFoundError("Plan");

    plan.status = "paused";
    plan.updated_at = new Date().toISOString();
    await upsertPlan(plan);

    // Remove repeatable job
    const { syncPlanSchedule } = await import("@loadtoad/queue");
    await syncPlanSchedule(id, plan.schedule, false);

    return ok({
      ...plan.schedule,
      enabled: false,
    });
  } catch (err) {
    console.error("[api-v1] Failed to pause schedule:", err);
    return serverError("Failed to pause schedule");
  }
});
