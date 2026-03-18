import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/plan-runs/active — get all currently running/queued plan runs with scenario statuses */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ active: false, plan_runs: [] });
    }

    const { getClient } = await import("@loadtoad/db");
    const sql = getClient();

    // Find all running or queued plan runs (cap at 10)
    const rows = await sql`
      SELECT pr.id, pr.plan_id, pr.status, pr.total_scenarios,
             pr.completed_scenarios, pr.failed_scenarios, pr.started_at,
             p.name as plan_name,
             e.name as environment_name
      FROM plan_runs pr
      JOIN plans p ON p.id = pr.plan_id
      LEFT JOIN environments e ON e.id = pr.environment_id
      WHERE pr.status IN ('running', 'queued')
      ORDER BY pr.created_at DESC
      LIMIT 10
    `;

    if (rows.length === 0) {
      return NextResponse.json({ active: false, plan_runs: [] });
    }

    const planRunIds = rows.map((r) => r.id as string);

    // Batch-fetch scenarios for all active plan runs
    const scenarioRows = await sql`
      SELECT
        prs.plan_run_id,
        prs.index,
        prs.status,
        prs.run_id,
        prs.scenario_id,
        prs.started_at,
        prs.completed_at,
        prs.duration_seconds,
        prs.error,
        COALESCE(s.name, 'Unnamed') as scenario_name
      FROM plan_run_scenarios prs
      LEFT JOIN scenarios s ON s.id = prs.scenario_id
      WHERE prs.plan_run_id = ANY(${planRunIds})
      ORDER BY prs.index ASC
    `;

    // Group scenarios by plan_run_id
    type ScenarioRow = (typeof scenarioRows)[number];
    const scenariosByPlanRun = new Map<string, ScenarioRow[]>();
    for (const s of scenarioRows) {
      const prId = s.plan_run_id as string;
      if (!scenariosByPlanRun.has(prId)) scenariosByPlanRun.set(prId, []);
      scenariosByPlanRun.get(prId)!.push(s);
    }

    const planRuns = rows.map((planRun) => {
      const scenarios = scenariosByPlanRun.get(planRun.id as string) ?? [];
      return {
        id: planRun.id,
        plan_id: planRun.plan_id,
        plan_name: planRun.plan_name,
        status: planRun.status,
        total_scenarios: planRun.total_scenarios,
        completed_scenarios: planRun.completed_scenarios,
        failed_scenarios: planRun.failed_scenarios,
        started_at: planRun.started_at
          ? new Date(planRun.started_at as string | Date).toISOString()
          : null,
        environment_name: (planRun.environment_name as string) ?? null,
        scenarios: scenarios.map((s) => ({
          index: s.index as number,
          status: s.status as string,
          run_id: (s.run_id as string) ?? null,
          scenario_id: (s.scenario_id as string) ?? null,
          scenario_name: s.scenario_name as string,
          started_at: s.started_at
            ? new Date(s.started_at as string | Date).toISOString()
            : null,
          completed_at: s.completed_at
            ? new Date(s.completed_at as string | Date).toISOString()
            : null,
          duration_seconds: (s.duration_seconds as number) ?? null,
          error: (s.error as string) ?? null,
        })),
      };
    });

    return NextResponse.json({
      active: true,
      plan_runs: planRuns,
      // Backward compatibility: also expose the first plan_run at top level
      plan_run: planRuns[0],
    });
  } catch (err) {
    console.error("Failed to check active plan runs:", err);
    return NextResponse.json({ active: false, plan_runs: [] });
  }
}
