import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/environments/:id — get a single environment */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { getEnvironment } = await import("@loadtoad/db");
    const environment = await getEnvironment(params.id);
    if (!environment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ environment });
  } catch (err) {
    console.error(`Failed to get environment ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** PUT /api/environments/:id — update an environment */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const body = await request.json();
    if (body.id && body.id !== params.id) {
      return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
    }
    body.id = params.id;
    const { upsertEnvironment } = await import("@loadtoad/db");
    const saved = await upsertEnvironment(body);
    return NextResponse.json({ environment: saved });
  } catch (err) {
    console.error(`Failed to update environment ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/environments/:id — delete an environment */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { deleteEnvironment } = await import("@loadtoad/db");
    const deleted = await deleteEnvironment(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete environment ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
