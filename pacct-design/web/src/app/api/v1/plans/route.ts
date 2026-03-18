import { randomUUID } from "node:crypto";
import { withApiAuth } from "@/lib/api-v1/middleware";
import { paginated, created } from "@/lib/api-v1/response";
import { validationError, serverError } from "@/lib/api-v1/errors";
import { parsePaginationParams, encodeCursor } from "@/lib/api-v1/pagination";
import type { Plan } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/v1/plans — list plans (excludes auto-generated) */
export const GET = withApiAuth(async (request, ctx) => {
  const url = new URL(request.url);
  const { limit, cursor } = parsePaginationParams(url.searchParams);

  const { listPlans } = await import("@loadtoad/db");
  const all = await listPlans({ limit: 10000 });

  // Exclude auto-generated plans
  let items = all.filter((p) => !p.name.endsWith("(Auto)"));
  const total = items.length;

  // Apply cursor
  if (cursor) {
    const idx = items.findIndex((p) => p.id === cursor.id);
    if (idx >= 0) items = items.slice(idx + 1);
  }

  const page = items.slice(0, limit);
  const has_more = items.length > limit;
  const nextCursor =
    has_more && page.length > 0
      ? encodeCursor({
          id: page[page.length - 1].id,
          created_at: page[page.length - 1].created_at,
        })
      : null;

  return paginated(page, { cursor: nextCursor, has_more, total });
});

/** POST /api/v1/plans — create a plan */
export const POST = withApiAuth(async (request, ctx) => {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return validationError("name is required");
    }

    const now = new Date().toISOString();
    const plan: Plan = {
      id: randomUUID(),
      name: body.name,
      description: body.description ?? "",
      scenario_ids: body.scenario_ids ?? [],
      environments: [],
      environment_ids: body.environment_ids ?? [],
      gate_ids: body.gate_ids ?? [],
      schedule: body.schedule ?? { type: "manual", expression: "Manual" },
      status: "active",
      policy_mode: "SCOUT",
      est_duration: "",
      est_duration_seconds: 0,
      created_at: now,
      updated_at: now,
    };

    const { upsertPlan } = await import("@loadtoad/db");
    const saved = await upsertPlan(plan);

    // Sync schedule if not manual
    if (saved.schedule.type !== "manual" && saved.schedule.type !== "on_deploy") {
      const { syncPlanSchedule } = await import("@loadtoad/queue");
      await syncPlanSchedule(saved.id, saved.schedule, true);
    }

    return created(saved);
  } catch (err) {
    console.error("[api-v1] Failed to create plan:", err);
    return serverError("Failed to create plan");
  }
});
