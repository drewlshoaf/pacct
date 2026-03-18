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

/** POST /api/v1/scenarios/:id/run — run a scenario */
export const POST = withApiAuth(async (request, ctx) => {
  try {
    const scenarioId = getIdFromUrl(request);
    const body = await request.json().catch(() => ({}));
    const idempotencyKey: string | undefined = body.idempotency_key;

    // Check idempotency
    if (idempotencyKey) {
      const cached = await getIdempotentResponse(ctx.keyId, idempotencyKey);
      if (cached) {
        return NextResponse.json({ data: cached }, { status: 202 });
      }
    }

    // Load scenario
    const { getScenario, upsertPlan, findAutoPlanForScenario, createPlanRun, createPlanRunScenarios } =
      await import("@loadtoad/db");
    const scenario = await getScenario(scenarioId);
    if (!scenario) return notFoundError("Scenario");

    if (!scenario.steps || scenario.steps.length === 0) {
      return validationError("Scenario has no steps defined");
    }
    if (!scenario.metadata.base_url) {
      return validationError("Scenario has no base_url configured");
    }

    // Enforce max parallel runs
    const CONFIG_KEY = "sv:config:injectors";
    const { getRedisConnection, getPlanQueue } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    const configRaw = await redis.get(CONFIG_KEY);
    const configOverrides = configRaw ? JSON.parse(configRaw) : {};
    const maxRuns: number =
      configOverrides.max_runs ?? parseInt(process.env.LT_MAX_RUNS || "10", 10);

    const { getClient } = await import("@loadtoad/db");
    const sql = getClient();
    const activeRows = await sql`
      SELECT COUNT(*)::int AS count FROM plan_runs WHERE status IN ('running', 'queued')
    `;
    const activeCount = activeRows[0]?.count ?? 0;
    if (activeCount >= maxRuns) {
      return rateLimitError(30);
    }

    const now = new Date().toISOString();
    const scenarioName = scenario.metadata.name || "Unnamed Scenario";

    // Reuse existing auto-plan or create one
    const existingPlan = await findAutoPlanForScenario(scenarioId);
    let planId: string;

    if (existingPlan) {
      planId = existingPlan.id;
    } else {
      planId = randomUUID();
      await upsertPlan({
        id: planId,
        name: `${scenarioName} (Auto)`,
        description: `Auto-generated plan for running ${scenarioName}`,
        scenario_ids: [scenarioId],
        environments: [],
        environment_ids: [],
        gate_ids: [],
        schedule: { type: "manual", expression: "Manual" },
        status: "active",
        policy_mode: "SCOUT",
        est_duration: "",
        est_duration_seconds: 0,
        created_at: now,
        updated_at: now,
      });
    }

    // Create plan run + child scenario records
    const planRunId = randomUUID();
    await createPlanRun({
      id: planRunId,
      plan_id: planId,
      status: "queued",
      environment_id: body.environment_id ?? null,
      triggered_by: "api",
      total_scenarios: 1,
      est_duration_seconds: 0,
    });
    await createPlanRunScenarios(planRunId, [scenarioId]);

    // Enqueue execution
    const queue = getPlanQueue();
    await queue.add("plan:execute", {
      plan_run_id: planRunId,
      plan_id: planId,
      scenario_ids: [scenarioId],
      environment_id: body.environment_id ?? null,
      environment_base_url: null,
      triggered_by: "api",
      requested_at: now,
      policy_mode: "SCOUT",
    });

    const responseData = {
      run_id: planRunId,
      plan_run_id: planRunId,
      status: "queued",
    };

    // Store idempotent response
    if (idempotencyKey) {
      await storeIdempotentResponse(ctx.keyId, idempotencyKey, responseData);
    }

    return accepted(responseData);
  } catch (err) {
    console.error("[api-v1] Failed to run scenario:", err);
    return serverError("Failed to enqueue scenario run");
  }
});
