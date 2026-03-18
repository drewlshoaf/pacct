import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok, noContent } from "@/lib/api-v1/response";
import { notFoundError, serverError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

function getIdFromUrl(request: Request): string {
  return new URL(request.url).pathname.split("/")[4];
}

/** GET /api/v1/plans/:id */
export const GET = withApiAuth(async (request, ctx) => {
  const id = getIdFromUrl(request);
  const { getPlan } = await import("@loadtoad/db");
  const plan = await getPlan(id);
  if (!plan) return notFoundError("Plan");
  return ok(plan);
});

/** PUT /api/v1/plans/:id */
export const PUT = withApiAuth(async (request, ctx) => {
  try {
    const id = getIdFromUrl(request);
    const { getPlan, upsertPlan } = await import("@loadtoad/db");

    const existing = await getPlan(id);
    if (!existing) return notFoundError("Plan");

    const body = await request.json();
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      scenario_ids: body.scenario_ids ?? existing.scenario_ids,
      environment_ids: body.environment_ids ?? existing.environment_ids,
      gate_ids: body.gate_ids ?? existing.gate_ids,
      schedule: body.schedule ?? existing.schedule,
      updated_at: now,
    };

    const saved = await upsertPlan(updated);

    // Re-sync schedule
    const { syncPlanSchedule } = await import("@loadtoad/queue");
    await syncPlanSchedule(saved.id, saved.schedule, saved.status === "active");

    return ok(saved);
  } catch (err) {
    console.error("[api-v1] Failed to update plan:", err);
    return serverError("Failed to update plan");
  }
});

/** DELETE /api/v1/plans/:id */
export const DELETE = withApiAuth(async (request, ctx) => {
  const id = getIdFromUrl(request);
  const { getPlan, deletePlan } = await import("@loadtoad/db");

  const plan = await getPlan(id);
  if (!plan) return notFoundError("Plan");

  // Remove schedule first
  const { syncPlanSchedule } = await import("@loadtoad/queue");
  await syncPlanSchedule(id, plan.schedule, false);

  await deletePlan(id);
  return noContent();
});
