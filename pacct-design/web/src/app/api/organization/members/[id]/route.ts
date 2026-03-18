import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { getMember } = await import("@loadtoad/db");
    const member = await getMember(id);
    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ member });
  } catch (err) {
    console.error(`Failed to get member ${id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const body = await request.json();
    if (body.id && body.id !== id) {
      return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
    }
    body.id = id;
    const { getMember: getMemberForUpdate, upsertMember, listMembers: listMembersForUpdate } = await import("@loadtoad/db");
    // Prevent demoting the last admin/owner to member
    const existing = await getMemberForUpdate(id);
    if (existing && (existing.role === "owner" || existing.role === "admin") && body.role === "member") {
      const all = await listMembersForUpdate({ limit: 1000 });
      const adminCount = all.filter(m => m.role === "owner" || m.role === "admin").length;
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 403 });
      }
    }
    const saved = await upsertMember(body);
    return NextResponse.json({ member: saved });
  } catch (err) {
    console.error(`Failed to update member ${id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { getMember, deleteMember, listMembers } = await import("@loadtoad/db");
    const member = await getMember(id);
    if (!member) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (member.role === "owner") {
      return NextResponse.json({ error: "Cannot remove the organization owner" }, { status: 403 });
    }
    // Prevent deleting the last admin
    if (member.role === "admin") {
      const all = await listMembers({ limit: 1000 });
      const adminCount = all.filter(m => m.role === "owner" || m.role === "admin").length;
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 403 });
      }
    }
    const deleted = await deleteMember(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete member ${id}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
