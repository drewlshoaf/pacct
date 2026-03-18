import { NextResponse } from "next/server";
import type { Scenario } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/scenarios — list all scenarios */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const { listScenarios } = await import("@loadtoad/db");
    const scenarios = await listScenarios({ limit, offset });
    return NextResponse.json(scenarios);
  } catch (err) {
    console.error("Failed to list scenarios:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/** POST /api/scenarios — create or update a scenario */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Scenario;
    const { upsertScenario } = await import("@loadtoad/db");
    const saved = await upsertScenario(body);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("Failed to save scenario:", err);
    return NextResponse.json(
      { error: "Failed to save scenario" },
      { status: 500 },
    );
  }
}
