import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/plan-runs — list all plan runs with pagination, sort, search */
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ plan_runs: [], total: 0, limit: 25, offset: 0 });
    }

    const { listAllPlanRuns } = await import("@loadtoad/db");
    const url = new URL(request.url);
    const params = url.searchParams;

    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 25));
    const offset = Math.max(0, Number(params.get("offset")) || 0);

    const result = await listAllPlanRuns({
      limit,
      offset,
      search: params.get("search") || undefined,
      status: params.get("status") || undefined,
    });

    return NextResponse.json({
      plan_runs: result.plan_runs,
      total: result.total,
      limit,
      offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Failed to list plan runs:", message, stack);
    return NextResponse.json(
      { plan_runs: [], total: 0, limit: 25, offset: 0, error: message },
      { status: 500 },
    );
  }
}
