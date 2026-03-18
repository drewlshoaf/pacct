import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/environments/:id/default — set this environment as the default */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { setDefaultEnvironment } = await import("@loadtoad/db");
    const environment = await setDefaultEnvironment(params.id);
    if (!environment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ environment });
  } catch (err) {
    console.error(`Failed to set default environment ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/environments/:id/default — clear default from this environment */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { clearDefaultEnvironment } = await import("@loadtoad/db");
    const environment = await clearDefaultEnvironment(params.id);
    if (!environment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ environment });
  } catch (err) {
    console.error(`Failed to clear default environment ${params.id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
