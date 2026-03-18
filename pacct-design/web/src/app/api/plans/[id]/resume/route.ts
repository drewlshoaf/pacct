import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/plans/:id/resume — resume a paused plan and restore its schedule */
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

    plan.status = "active";
    plan.updated_at = new Date().toISOString();
    await upsertPlan(plan);

    // Restore repeatable/delayed job
    const { syncPlanSchedule } = await import("@loadtoad/queue");
    await syncPlanSchedule(params.id, plan.schedule, true);

    return NextResponse.json({ ok: true, status: "active" });
  } catch (err) {
    console.error(`Failed to resume plan ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
