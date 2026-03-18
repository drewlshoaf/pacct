import { NextResponse } from "next/server";
import type { Gate } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/gates — list all gates */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const { listGates } = await import("@loadtoad/db");
    const gates = await listGates({ limit, offset });
    return NextResponse.json(gates);
  } catch (err) {
    console.error("Failed to list gates:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/** POST /api/gates — create or update a gate */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Gate;
    const { upsertGate } = await import("@loadtoad/db");
    const saved = await upsertGate(body);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("Failed to save gate:", err);
    return NextResponse.json(
      { error: "Failed to save gate" },
      { status: 500 },
    );
  }
}
