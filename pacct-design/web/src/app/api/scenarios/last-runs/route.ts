import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/scenarios/last-runs — map of scenario_id → last run timestamp */
export async function GET() {
  try {
    const { getScenarioLastRuns } = await import("@loadtoad/db");
    const map = await getScenarioLastRuns();
    return NextResponse.json(map);
  } catch (err) {
    console.error("Failed to fetch scenario last runs:", err);
    return NextResponse.json({}, { status: 200 });
  }
}
