import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";
import { notFoundError, serverError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

function getIdFromUrl(request: Request): string {
  return new URL(request.url).pathname.split("/")[4];
}

/** POST /api/v1/plans/:id/schedule/resume */
export const POST = withApiAuth(async (request, ctx) => {
  try {
    const id = getIdFromUrl(request);
    const { getPlan, upsertPlan } = await import("@loadtoad/db");
    const plan = await getPlan(id);
    if (!plan) return notFoundError("Plan");

    plan.status = "active";
    plan.updated_at = new Date().toISOString();
    await upsertPlan(plan);

    // Restore repeatable job
    const { syncPlanSchedule } = await import("@loadtoad/queue");
    await syncPlanSchedule(id, plan.schedule, true);

    return ok({
      ...plan.schedule,
      enabled: true,
    });
  } catch (err) {
    console.error("[api-v1] Failed to resume schedule:", err);
    return serverError("Failed to resume schedule");
  }
});
