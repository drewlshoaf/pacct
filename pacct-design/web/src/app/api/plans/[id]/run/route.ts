import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

/** POST /api/plans/:id/run — manually trigger a plan run */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { getPlan, createPlanRun, createPlanRunScenarios, getClient } = await import("@loadtoad/db");
    const plan = await getPlan(params.id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.scenario_ids.length === 0) {
      return NextResponse.json(
        { error: "Plan has no scenarios" },
        { status: 422 },
      );
    }

    // Enforce max parallel runs
    const CONFIG_KEY = "sv:config:injectors";
    const { getRedisConnection, getPlanQueue } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    const configRaw = await redis.get(CONFIG_KEY);
    const configOverrides = configRaw ? JSON.parse(configRaw) : {};
    const maxRuns: number = configOverrides.max_runs ?? parseInt(process.env.LT_MAX_RUNS || "2", 10);

    const sql = getClient();
    const activeRows = await sql`
      SELECT COUNT(*)::int AS count FROM plan_runs WHERE status IN ('running', 'queued')
    `;
    const activeCount = activeRows[0]?.count ?? 0;
    if (activeCount >= maxRuns) {
      return NextResponse.json(
        { error: `Maximum parallel runs (${maxRuns}) reached. Wait for a run to finish.` },
        { status: 429 },
      );
    }

    const now = new Date().toISOString();
    const planRunId = randomUUID();

    await createPlanRun({
      id: planRunId,
      plan_id: plan.id,
      status: "queued",
      environment_id: plan.environment_ids[0] ?? null,
      triggered_by: "web-ui",
      total_scenarios: plan.scenario_ids.length,
      est_duration_seconds: plan.est_duration_seconds,
    });
    await createPlanRunScenarios(planRunId, plan.scenario_ids);

    const queue = getPlanQueue();
    await queue.add("plan:execute", {
      plan_run_id: planRunId,
      plan_id: plan.id,
      scenario_ids: plan.scenario_ids,
      environment_id: plan.environment_ids[0] ?? null,
      environment_base_url: null,
      triggered_by: "web-ui",
      requested_at: now,
      policy_mode: plan.policy_mode ?? "SCOUT",
    });

    return NextResponse.json(
      { plan_run_id: planRunId, status: "queued" },
      { status: 202 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to run plan ${params.id}:`, message);
    return NextResponse.json(
      { error: "Failed to enqueue plan run", detail: message },
      { status: 500 },
    );
  }
}
