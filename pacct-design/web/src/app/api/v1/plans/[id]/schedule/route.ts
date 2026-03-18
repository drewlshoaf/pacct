import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok, noContent } from "@/lib/api-v1/response";
import { notFoundError, validationError, serverError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

const VALID_SCHEDULE_TYPES = ["manual", "once", "daily", "weekly", "monthly", "quarterly", "cron"];

function getIdFromUrl(request: Request): string {
  return new URL(request.url).pathname.split("/")[4];
}

/** GET /api/v1/plans/:id/schedule */
export const GET = withApiAuth(async (request, ctx) => {
  const id = getIdFromUrl(request);
  const { getPlan } = await import("@loadtoad/db");
  const plan = await getPlan(id);
  if (!plan) return notFoundError("Plan");

  return ok({
    ...plan.schedule,
    enabled: plan.status === "active",
  });
});

/** PUT /api/v1/plans/:id/schedule — update schedule */
export const PUT = withApiAuth(async (request, ctx) => {
  try {
    const id = getIdFromUrl(request);
    const body = await request.json();

    if (!body.type || !VALID_SCHEDULE_TYPES.includes(body.type)) {
      return validationError(
        `Invalid schedule type. Must be one of: ${VALID_SCHEDULE_TYPES.join(", ")}`,
      );
    }

    const { getPlan, upsertPlan } = await import("@loadtoad/db");
    const plan = await getPlan(id);
    if (!plan) return notFoundError("Plan");

    plan.schedule = body;
    plan.updated_at = new Date().toISOString();
    const saved = await upsertPlan(plan);

    // Sync schedule
    const { syncPlanSchedule } = await import("@loadtoad/queue");
    await syncPlanSchedule(saved.id, saved.schedule, saved.status === "active");

    return ok({
      ...saved.schedule,
      enabled: saved.status === "active",
    });
  } catch (err) {
    console.error("[api-v1] Failed to update schedule:", err);
    return serverError("Failed to update schedule");
  }
});

/** DELETE /api/v1/plans/:id/schedule — set to manual */
export const DELETE = withApiAuth(async (request, ctx) => {
  const id = getIdFromUrl(request);
  const { getPlan, upsertPlan } = await import("@loadtoad/db");
  const plan = await getPlan(id);
  if (!plan) return notFoundError("Plan");

  plan.schedule = { type: "manual", expression: "Manual" };
  plan.updated_at = new Date().toISOString();
  await upsertPlan(plan);

  // Remove schedule
  const { syncPlanSchedule } = await import("@loadtoad/queue");
  await syncPlanSchedule(id, plan.schedule, false);

  return noContent();
});
