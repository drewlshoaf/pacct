import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

/** POST /api/runs/start — create an auto-plan for the scenario and enqueue a plan run */
export async function POST(request: Request) {
  try {
    const { scenario_id, policy_mode } = (await request.json()) as {
      scenario_id: string;
      policy_mode?: string;
    };

    if (!scenario_id) {
      return NextResponse.json(
        { error: "scenario_id is required" },
        { status: 400 },
      );
    }

    // Validate policy_mode if provided
    const validModes = ["SCOUT", "FORENSICS"];
    if (policy_mode && !validModes.includes(policy_mode)) {
      return NextResponse.json(
        { error: `Invalid policy_mode: ${policy_mode}. Must be one of: ${validModes.join(", ")}` },
        { status: 400 },
      );
    }

    // Load scenario from DB
    const { getScenario, upsertPlan, findAutoPlanForScenario, createPlanRun, createPlanRunScenarios } = await import("@loadtoad/db");
    const scenario = await getScenario(scenario_id);
    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    // Validate scenario has at least one step and a base_url
    if (!scenario.steps || scenario.steps.length === 0) {
      return NextResponse.json(
        { error: "Scenario has no steps defined" },
        { status: 422 },
      );
    }

    if (!scenario.metadata.base_url) {
      return NextResponse.json(
        { error: "Scenario has no base_url configured. Set it in Metadata → Environment." },
        { status: 422 },
      );
    }

    // ── Enforce max parallel runs ────────────────────────────────────
    const CONFIG_KEY = "sv:config:injectors";
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    const configRaw = await redis.get(CONFIG_KEY);
    const configOverrides = configRaw ? JSON.parse(configRaw) : {};
    const maxRuns: number = configOverrides.max_runs ?? parseInt(process.env.LT_MAX_RUNS || "10", 10);

    const { getClient } = await import("@loadtoad/db");
    const sql = getClient();
    const activeRows = await sql`
      SELECT COUNT(*)::int AS count FROM plan_runs WHERE status IN ('running', 'queued')
    `;
    const activeCount = activeRows[0]?.count ?? 0;
    if (activeCount >= maxRuns) {
      return NextResponse.json(
        { error: `Maximum parallel runs (${maxRuns}) reached. Wait for a run to finish or increase the limit in Infrastructure → Configuration.` },
        { status: 429 },
      );
    }

    const now = new Date().toISOString();

    // Reuse existing auto-plan for this scenario, or create a new one
    const scenarioName = scenario.metadata.name || "Unnamed Scenario";
    const existingPlan = await findAutoPlanForScenario(scenario_id);
    let plan_id: string;
    let effectivePolicyMode: string;

    if (existingPlan) {
      plan_id = existingPlan.id;
      effectivePolicyMode = policy_mode || existingPlan.policy_mode || "SCOUT";
    } else {
      plan_id = randomUUID();
      effectivePolicyMode = policy_mode || "SCOUT";
      await upsertPlan({
        id: plan_id,
        name: `${scenarioName} (Auto)`,
        description: `Auto-generated plan for running ${scenarioName}`,
        scenario_ids: [scenario_id],
        environments: [],
        environment_ids: [],
        gate_ids: [],
        schedule: { type: "manual", expression: "Manual" },
        status: "active",
        policy_mode: effectivePolicyMode as "SCOUT" | "FORENSICS",
        est_duration: "",
        est_duration_seconds: 0,
        created_at: now,
        updated_at: now,
      });
    }

    // Create plan_run + plan_run_scenarios records
    const plan_run_id = randomUUID();
    await createPlanRun({
      id: plan_run_id,
      plan_id,
      status: "queued",
      environment_id: null,
      triggered_by: "web-ui",
      total_scenarios: 1,
      est_duration_seconds: 0,
    });
    await createPlanRunScenarios(plan_run_id, [scenario_id]);

    // Enqueue plan execution
    const { getPlanQueue } = await import("@loadtoad/queue");
    const queue = getPlanQueue();
    await queue.add("plan:execute", {
      plan_run_id,
      plan_id,
      scenario_ids: [scenario_id],
      environment_id: null,
      environment_base_url: null,
      triggered_by: "web-ui",
      requested_at: now,
      policy_mode: effectivePolicyMode,
    });

    return NextResponse.json(
      { run_id: plan_run_id, status: "queued" },
      { status: 202 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Failed to start run:", message, stack);
    return NextResponse.json(
      { error: "Failed to enqueue run", detail: message },
      { status: 500 },
    );
  }
}
