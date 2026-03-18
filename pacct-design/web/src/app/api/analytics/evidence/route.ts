import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/analytics/evidence — evidence panel data for a run + assertion type */
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ type: "run_failed", failure_reason: "No database", stop_time: null });
    }

    const url = new URL(request.url);
    const runId = url.searchParams.get("runId");
    const planRunId = url.searchParams.get("planRunId");
    const scenarioId = url.searchParams.get("scenarioId");
    const assertionType = url.searchParams.get("type") ?? "p95";

    if (planRunId && scenarioId) {
      const { getPlanRunScenarioEvidence } = await import("@loadtoad/db");
      const data = await getPlanRunScenarioEvidence(planRunId, scenarioId, assertionType);
      return NextResponse.json(data);
    }

    if (!runId) {
      return NextResponse.json({ type: "run_failed", failure_reason: "Missing runId parameter", stop_time: null });
    }

    const { getRunEvidenceData } = await import("@loadtoad/db");
    const data = await getRunEvidenceData(runId, assertionType);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/analytics/evidence]", err);
    return NextResponse.json({ type: "run_failed", failure_reason: "Server error", stop_time: null });
  }
}
