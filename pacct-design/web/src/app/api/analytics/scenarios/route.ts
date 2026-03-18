import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const USE_DB = !!process.env.DATABASE_URL;

export async function GET(request: Request) {
  if (!USE_DB) {
    return NextResponse.json({ scenarios: [], dataPoints: [] });
  }

  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");

    if (!name) {
      const { listScenarioNamesWithRuns } = await import("@loadtoad/db");
      const scenarios = await listScenarioNamesWithRuns();
      return NextResponse.json({ scenarios });
    }

    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const { getScenarioLongitudinalMetrics } = await import("@loadtoad/db");
    const dataPoints = await getScenarioLongitudinalMetrics(name, limit);
    return NextResponse.json({ name, dataPoints });
  } catch (err) {
    console.error("Failed to fetch scenario analytics:", err);
    return NextResponse.json({ scenarios: [], dataPoints: [] });
  }
}
