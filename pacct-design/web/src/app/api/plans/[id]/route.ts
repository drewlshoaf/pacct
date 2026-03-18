import { NextResponse } from "next/server";
import type { Plan } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/plans/:id — plan detail with recent runs and scenario names */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { getPlan, listPlanRuns, getScenario } = await import("@loadtoad/db");
    const plan = await getPlan(params.id);
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch recent runs
    const recentRuns = await listPlanRuns(plan.id, 10);

    // Fetch scenario names
    const scenarios = await Promise.all(
      plan.scenario_ids.map(async (sid) => {
        const s = await getScenario(sid);
        return {
          id: sid,
          name: s?.metadata?.name ?? "Unknown Scenario",
          type: s?.steps?.[0]?.config?.step_type ?? "rest",
          step_count: s?.steps?.length ?? 0,
          exists: !!s,
        };
      }),
    );

    return NextResponse.json({ plan, recent_runs: recentRuns, scenarios });
  } catch (err) {
    console.error(`Failed to get plan ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** PUT /api/plans/:id — update a plan */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as Plan;
    if (body.id !== params.id) {
      return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
    }

    const { upsertPlan } = await import("@loadtoad/db");
    body.updated_at = new Date().toISOString();
    const saved = await upsertPlan(body);

    // Re-sync schedule
    const { syncPlanSchedule } = await import("@loadtoad/queue");
    await syncPlanSchedule(saved.id, saved.schedule, saved.status === "active");

    return NextResponse.json(saved);
  } catch (err) {
    console.error(`Failed to update plan ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/plans/:id — delete a plan */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // Remove schedule first
    const { getPlan, deletePlan } = await import("@loadtoad/db");
    const plan = await getPlan(params.id);
    if (plan) {
      const { syncPlanSchedule } = await import("@loadtoad/queue");
      await syncPlanSchedule(params.id, plan.schedule, false);
    }

    const deleted = await deletePlan(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete plan ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
