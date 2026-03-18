import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ members: [] });
    }
    const { listMembers } = await import("@loadtoad/db");
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const members = await listMembers({ limit, offset });
    return NextResponse.json({ members });
  } catch (err) {
    console.error("Failed to list members:", err);
    return NextResponse.json({ error: "Failed to list members" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const body = await request.json();
    if (!body.name || !body.email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }
    const { upsertMember } = await import("@loadtoad/db");
    const saved = await upsertMember(body);
    return NextResponse.json({ member: saved }, { status: 201 });
  } catch (err) {
    console.error("Failed to create member:", err);
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
  }
}
