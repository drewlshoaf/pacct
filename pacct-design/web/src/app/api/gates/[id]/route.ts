import { NextResponse } from "next/server";
import type { Gate } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/gates/:id — get a single gate */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { getGate } = await import("@loadtoad/db");
    const gate = await getGate(params.id);
    if (!gate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(gate);
  } catch (err) {
    console.error(`Failed to get gate ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** PUT /api/gates/:id — update a gate */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = (await request.json()) as Gate;
    if (body.id !== params.id) {
      return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
    }
    const { upsertGate } = await import("@loadtoad/db");
    const saved = await upsertGate(body);
    return NextResponse.json(saved);
  } catch (err) {
    console.error(`Failed to update gate ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/gates/:id — delete a gate */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { deleteGate } = await import("@loadtoad/db");
    const deleted = await deleteGate(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete gate ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
