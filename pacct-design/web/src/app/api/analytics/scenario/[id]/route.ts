import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/scenario/[id]
 *
 * Returns the full ScenarioAnalyticsResponse for a given scenario.
 *
 * Query params:
 *   baseline - "prev" | "last5" | "last10" (default: "prev")
 *   limit    - max runs in window (default: 50, max: 100)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const { id: scenarioId } = await params;
    if (!scenarioId) {
      return NextResponse.json(
        { error: "Missing scenario id" },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const baselineParam = url.searchParams.get("baseline") ?? "prev";
    const baselineMode =
      baselineParam === "last5" || baselineParam === "last10"
        ? baselineParam
        : "prev";
    const limit = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit")) || 50),
    );

    const { getScenarioAnalytics } = await import("@loadtoad/db");
    const result = await getScenarioAnalytics({
      scenarioId,
      baselineMode,
      limit,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/analytics/scenario/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
