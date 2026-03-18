import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/scenarios/gate-counts — map of scenario_id → gate count */
export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({});
    }

    const { getClient } = await import("@loadtoad/db");
    const sql = getClient();

    const rows = await sql`
      SELECT entity_id, count(*)::int AS gate_count
      FROM gates
      WHERE entity_type = 'scenario' AND enabled = true
      GROUP BY entity_id
    `;

    const map: Record<string, number> = {};
    for (const row of rows) {
      map[row.entity_id as string] = row.gate_count as number;
    }

    return NextResponse.json(map);
  } catch (err) {
    console.error("Failed to fetch scenario gate counts:", err);
    return NextResponse.json({}, { status: 200 });
  }
}
