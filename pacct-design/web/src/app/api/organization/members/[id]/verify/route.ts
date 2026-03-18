import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { getMember, upsertMember } = await import("@loadtoad/db");
    const member = await getMember(id);
    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    const updated = await upsertMember({
      ...member,
      verified: true,
      verified_at: now,
      status: "active",
      updated_at: now,
    });
    return NextResponse.json({ member: updated, verified: true });
  } catch (err) {
    console.error(`Failed to verify member ${id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
