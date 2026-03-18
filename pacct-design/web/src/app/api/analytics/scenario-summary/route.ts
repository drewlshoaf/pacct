import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/analytics/scenario-summary — scenario scope analytics data */
export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "No database" }, { status: 500 });
    }

    const url = new URL(request.url);
    const scenarioId = url.searchParams.get("scenarioId");
    if (!scenarioId) {
      return NextResponse.json({ error: "Missing scenarioId" }, { status: 400 });
    }

    const { getClient } = await import("@loadtoad/db");
    const sql = getClient();

    // Fetch scenario metadata
    const scenarioRows = await sql`
      SELECT id, name, policy_mode, metadata_extra
      FROM scenarios WHERE id = ${scenarioId}
    `;
    if (scenarioRows.length === 0) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }

    const scenario = scenarioRows[0];
    const metaExtra = (scenario.metadata_extra ?? {}) as {
      assertions?: Array<{ metric: string; operator: string; threshold: number; unit: string }>;
    };

    // Fetch runs for this scenario via plan_run_scenarios
    const runRows = await sql`
      SELECT
        prs.plan_run_id,
        prs.run_id,
        prs.status as prs_status,
        prs.error as prs_error,
        prs.completed_at as prs_completed_at,
        r.decision,
        r.overall_score,
        r.created_at as run_created_at,
        rs.stability
      FROM plan_run_scenarios prs
      LEFT JOIN runs r ON r.id = prs.run_id
      LEFT JOIN run_scenarios rs ON rs.run_id = prs.run_id AND rs.index = 0
      WHERE prs.scenario_id = ${scenarioId}
      ORDER BY prs.completed_at DESC NULLS LAST
      LIMIT 50
    `;

    // Build run list
    const runList = runRows.map((row) => {
      const stability = row.stability as { score?: number } | null;
      return {
        run_id: (row.run_id as string) ?? null,
        plan_run_id: row.plan_run_id as string,
        date: row.prs_completed_at
          ? new Date(row.prs_completed_at as string | Date).toISOString()
          : row.run_created_at
            ? new Date(row.run_created_at as string | Date).toISOString()
            : null,
        status: row.prs_status as string,
        stability: stability?.score != null ? Math.round(stability.score * 100) : null,
        error: (row.prs_error as string) ?? null,
      };
    });

    // Fetch aggregate metrics for trend data
    const runIds = runRows
      .map((r) => r.run_id as string)
      .filter(Boolean);

    let p95Trend: Array<{ date: string; value: number }> = [];
    let errorTrend: Array<{ date: string; value: number }> = [];
    let stabilityTrend: Array<{ date: string; value: number }> = [];

    if (runIds.length > 0) {
      const bucketAggs = await sql`
        SELECT
          rb.run_id,
          r.created_at,
          avg(rb.latency_p95)::double precision as avg_p95,
          sum(rb.errors)::int as total_errors,
          sum(rb.requests)::int as total_requests
        FROM run_buckets rb
        JOIN runs r ON r.id = rb.run_id
        WHERE rb.run_id = ANY(${runIds}) AND rb.scenario_index = 0
        GROUP BY rb.run_id, r.created_at
        ORDER BY r.created_at ASC
      `;

      p95Trend = bucketAggs.map((row) => ({
        date: new Date(row.created_at as string | Date).toISOString(),
        value: Math.round(row.avg_p95 as number),
      }));

      errorTrend = bucketAggs.map((row) => {
        const reqs = row.total_requests as number;
        const errs = row.total_errors as number;
        return {
          date: new Date(row.created_at as string | Date).toISOString(),
          value: reqs > 0 ? +((errs / reqs) * 100).toFixed(2) : 0,
        };
      });

      // Stability trend from run_scenarios
      for (const row of runRows) {
        if (!row.run_id) continue;
        const stability = row.stability as { score?: number } | null;
        if (stability?.score == null) continue;
        const date = row.run_created_at
          ? new Date(row.run_created_at as string | Date).toISOString()
          : null;
        if (date) {
          stabilityTrend.push({ date, value: Math.round(stability.score * 100) });
        }
      }
      stabilityTrend.sort((a, b) => a.date.localeCompare(b.date));
    }

    // Latest run status line
    const latestRun = runList[0];
    const latestStatus = latestRun
      ? latestRun.status === "failed"
        ? `${scenario.name}: run failed`
        : latestRun.status
      : "—";

    return NextResponse.json({
      scenario_name: scenario.name as string,
      assertions: metaExtra?.assertions ?? [],
      latest_run_status: latestStatus,
      p95_trend: p95Trend,
      error_rate_trend: errorTrend,
      stability_trend: stabilityTrend.length > 0 ? stabilityTrend : null,
      run_list: runList,
    });
  } catch (err) {
    console.error("[GET /api/analytics/scenario-summary]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
