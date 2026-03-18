import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/plans/:id/pause — pause a plan and remove its schedule */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { getPlan, upsertPlan } = await import("@loadtoad/db");
    const plan = await getPlan(params.id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    plan.status = "paused";
    plan.updated_at = new Date().toISOString();
    await upsertPlan(plan);

    // Remove repeatable/delayed job
    const { syncPlanSchedule } = await import("@loadtoad/queue");
    await syncPlanSchedule(params.id, plan.schedule, false);

    return NextResponse.json({ ok: true, status: "paused" });
  } catch (err) {
    console.error(`Failed to pause plan ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
