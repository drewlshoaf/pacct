import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WINDOW_HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };

/** GET /api/analytics/global — global scope analytics data */
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        global_stability: null,
        stability_over_time: [], recent_plan_runs: [],
      });
    }

    const { getGlobalAnalytics } = await import("@loadtoad/db");
    const url = new URL(request.url);
    const window = url.searchParams.get("window") ?? "24h";
    const windowHours = WINDOW_HOURS[window] ?? 24;

    const data = await getGlobalAnalytics({ windowHours });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/analytics/global]", err);
    return NextResponse.json({
      global_stability: null,
      stability_over_time: [], recent_plan_runs: [],
    });
  }
}
