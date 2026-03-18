import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WINDOW_HOURS: Record<string, number> = {
  "24h": 24,
  "7d": 168,
  "30d": 720,
};

/** GET /api/dashboard — aggregated dashboard data (LIVE, gates, issues) */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        live: [],
        has_more_live: false,
        gates: { passed_count: 0, failed_count: 0, failed_gates: [] },
        issues: [],
      });
    }

    const windowParam = request.nextUrl.searchParams.get("window") ?? "24h";
    const windowHours = WINDOW_HOURS[windowParam] ?? 24;

    const { getDashboardData } = await import("@loadtoad/db");
    const data = await getDashboardData(windowHours);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({
      live: [],
      has_more_live: false,
      gates: { passed_count: 0, failed_count: 0, failed_gates: [] },
      issues: [],
    });
  }
}
