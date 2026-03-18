import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/runs/start-bulk — start multiple scenarios concurrently as a single plan run.
 *
 * Unlike /api/runs/start (which creates one plan_run per scenario), this endpoint
 * groups all scenario_ids into a single plan_run so the plan-orchestrator enqueues
 * all run-execute jobs at once and they execute in parallel.
 */
export async function POST(request: Request) {
  try {
    const { scenario_ids, policy_mode } = (await request.json()) as {
      scenario_ids: string[];
      policy_mode?: string;
    };

    if (!scenario_ids || scenario_ids.length === 0) {
      return NextResponse.json(
        { error: "scenario_ids is required and must be non-empty" },
        { status: 400 },
      );
    }

    const validModes = ["SCOUT", "FORENSICS"];
    if (policy_mode && !validModes.includes(policy_mode)) {
      return NextResponse.json(
        { error: `Invalid policy_mode: ${policy_mode}. Must be one of: ${validModes.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate all scenarios exist and have required fields
    const { getScenario, upsertPlan, createPlanRun, createPlanRunScenarios } = await import("@loadtoad/db");
    const scenarioNames: string[] = [];
    for (const id of scenario_ids) {
      const scenario = await getScenario(id);
      if (!scenario) {
        return NextResponse.json({ error: `Scenario not found: ${id}` }, { status: 404 });
      }
      if (!scenario.steps || scenario.steps.length === 0) {
        return NextResponse.json(
          { error: `Scenario "${scenario.metadata.name}" has no steps defined` },
          { status: 422 },
        );
      }
      if (!scenario.metadata.base_url) {
        return NextResponse.json(
          { error: `Scenario "${scenario.metadata.name}" has no base_url configured` },
          { status: 422 },
        );
      }
      scenarioNames.push(scenario.metadata.name || "Unnamed");
    }

    // Enforce max parallel runs
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
    const activeCount = (activeRows[0] as Record<string, unknown>)?.count ?? 0;
    if ((activeCount as number) >= maxRuns) {
      return NextResponse.json(
        { error: `Maximum parallel runs (${maxRuns}) reached. Wait for a run to finish or increase the limit.` },
        { status: 429 },
      );
    }

    const now = new Date().toISOString();
    const effectivePolicyMode = policy_mode || "SCOUT";

    // Create a plan for this bulk run
    const plan_id = randomUUID();
    const planName = scenario_ids.length === 1
      ? `${scenarioNames[0]} (Auto)`
      : `Bulk Run: ${scenarioNames.slice(0, 3).join(", ")}${scenarioNames.length > 3 ? ` +${scenarioNames.length - 3}` : ""}`;

    await upsertPlan({
      id: plan_id,
      name: planName,
      description: `Bulk run of ${scenario_ids.length} scenario${scenario_ids.length > 1 ? "s" : ""}`,
      scenario_ids,
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

    // Create plan_run + plan_run_scenarios
    const plan_run_id = randomUUID();
    await createPlanRun({
      id: plan_run_id,
      plan_id,
      status: "queued",
      environment_id: null,
      triggered_by: "web-ui",
      total_scenarios: scenario_ids.length,
      est_duration_seconds: 0,
    });
    await createPlanRunScenarios(plan_run_id, scenario_ids);

    // Enqueue single plan execution — the plan-orchestrator will enqueue all
    // scenarios to the run-execute queue at once for parallel execution.
    const { getPlanQueue } = await import("@loadtoad/queue");
    const queue = getPlanQueue();
    await queue.add("plan:execute", {
      plan_run_id,
      plan_id,
      scenario_ids,
      environment_id: null,
      environment_base_url: null,
      triggered_by: "web-ui",
      requested_at: now,
      policy_mode: effectivePolicyMode,
    });

    return NextResponse.json(
      { plan_run_id, status: "queued", scenario_count: scenario_ids.length },
      { status: 202 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to start bulk run:", message);
    return NextResponse.json(
      { error: "Failed to enqueue bulk run", detail: message },
      { status: 500 },
    );
  }
}
