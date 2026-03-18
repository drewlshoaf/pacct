import { randomUUID } from "node:crypto";
import { withApiAuth } from "@/lib/api-v1/middleware";
import { accepted } from "@/lib/api-v1/response";
import { notFoundError, validationError, serverError, rateLimitError } from "@/lib/api-v1/errors";
import { getIdempotentResponse, storeIdempotentResponse } from "@/lib/api-v1/idempotency";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getIdFromUrl(request: Request): string {
  return new URL(request.url).pathname.split("/")[4];
}

/** POST /api/v1/plans/:id/run — run a plan */
export const POST = withApiAuth(async (request, ctx) => {
  try {
    const planId = getIdFromUrl(request);
    const body = await request.json().catch(() => ({}));
    const idempotencyKey: string | undefined = body.idempotency_key;

    // Check idempotency
    if (idempotencyKey) {
      const cached = await getIdempotentResponse(ctx.keyId, idempotencyKey);
      if (cached) {
        return NextResponse.json({ data: cached }, { status: 202 });
      }
    }

    const { getPlan, createPlanRun, createPlanRunScenarios, getClient } =
      await import("@loadtoad/db");
    const plan = await getPlan(planId);
    if (!plan) return notFoundError("Plan");

    if (plan.scenario_ids.length === 0) {
      return validationError("Plan has no scenarios");
    }

    // Enforce max parallel runs
    const CONFIG_KEY = "sv:config:injectors";
    const { getRedisConnection, getPlanQueue } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    const configRaw = await redis.get(CONFIG_KEY);
    const configOverrides = configRaw ? JSON.parse(configRaw) : {};
    const maxRuns: number =
      configOverrides.max_runs ?? parseInt(process.env.LT_MAX_RUNS || "10", 10);

    const sql = getClient();
    const activeRows = await sql`
      SELECT COUNT(*)::int AS count FROM plan_runs WHERE status IN ('running', 'queued')
    `;
    const activeCount = activeRows[0]?.count ?? 0;
    if (activeCount >= maxRuns) {
      return rateLimitError(30);
    }

    const now = new Date().toISOString();
    const planRunId = randomUUID();

    await createPlanRun({
      id: planRunId,
      plan_id: plan.id,
      status: "queued",
      environment_id: body.environment_id ?? plan.environment_ids[0] ?? null,
      triggered_by: "api",
      total_scenarios: plan.scenario_ids.length,
      est_duration_seconds: plan.est_duration_seconds,
    });
    await createPlanRunScenarios(planRunId, plan.scenario_ids);

    const queue = getPlanQueue();
    await queue.add("plan:execute", {
      plan_run_id: planRunId,
      plan_id: plan.id,
      scenario_ids: plan.scenario_ids,
      environment_id: body.environment_id ?? plan.environment_ids[0] ?? null,
      environment_base_url: null,
      triggered_by: "api",
      requested_at: now,
      policy_mode: plan.policy_mode ?? "SCOUT",
    });

    const responseData = {
      plan_execution_id: planRunId,
      status: "queued",
    };

    if (idempotencyKey) {
      await storeIdempotentResponse(ctx.keyId, idempotencyKey, responseData);
    }

    return accepted(responseData);
  } catch (err) {
    console.error("[api-v1] Failed to run plan:", err);
    return serverError("Failed to enqueue plan run");
  }
});
