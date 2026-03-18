import { NextResponse } from "next/server";
import type { Scenario } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/scenarios/:id — get a single scenario */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { getScenario } = await import("@loadtoad/db");
    const scenario = await getScenario(params.id);
    if (!scenario) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(scenario);
  } catch (err) {
    console.error(`Failed to get scenario ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** PUT /api/scenarios/:id — update a scenario */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as Scenario;
    if (body.metadata.id !== params.id) {
      return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
    }
    const { upsertScenario } = await import("@loadtoad/db");
    const saved = await upsertScenario(body);
    return NextResponse.json(saved);
  } catch (err) {
    console.error(`Failed to update scenario ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/scenarios/:id — delete a scenario */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { deleteScenario } = await import("@loadtoad/db");
    const deleted = await deleteScenario(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete scenario ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
