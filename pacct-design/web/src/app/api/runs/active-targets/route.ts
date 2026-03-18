import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/runs/active-targets
 *
 * Returns the base_urls of all currently running or queued plan runs.
 * Used to detect duplicate target conflicts before launching new runs.
 */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ base_urls: [] });
    }

    const { getClient } = await import("@loadtoad/db");
    const sql = getClient();

    // Join plan_runs → plan_run_scenarios → scenarios to get active base_urls
    const rows = await sql`
      SELECT DISTINCT s.base_url
      FROM plan_runs pr
      JOIN plan_run_scenarios prs ON prs.plan_run_id = pr.id
      JOIN scenarios s ON s.id = prs.scenario_id
      WHERE pr.status IN ('running', 'queued')
        AND s.base_url IS NOT NULL
        AND s.base_url != ''
    `;

    const base_urls = rows.map((r) => (r as Record<string, unknown>).base_url as string);

    return NextResponse.json({ base_urls });
  } catch (err) {
    console.error("Failed to fetch active targets:", err);
    return NextResponse.json({ base_urls: [] });
  }
}
