import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/plan-runs/:id — enriched plan run detail with scenario scores + names */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { getEnrichedPlanRun } = await import("@loadtoad/db");
    const run = await getEnrichedPlanRun(id);
    if (!run) return NextResponse.json({ error: "Plan run not found" }, { status: 404 });
    return NextResponse.json({ plan_run: run });
  } catch (err) {
    console.error("Failed to get plan run:", err);
    return NextResponse.json({ error: "Failed to get plan run" }, { status: 500 });
  }
}

/** DELETE /api/plan-runs/:id — delete plan run and all child artifacts */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { deletePlanRun } = await import("@loadtoad/db");
    const deleted = await deletePlanRun(id);
    if (!deleted) return NextResponse.json({ error: "Plan run not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete plan run:", err);
    return NextResponse.json({ error: "Failed to delete plan run" }, { status: 500 });
  }
}
