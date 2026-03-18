import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ environments: [] });
    }
    const { listEnvironments } = await import("@loadtoad/db");
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");
    const environments = await listEnvironments({ limit, offset });
    return NextResponse.json({ environments });
  } catch (err) {
    console.error("Failed to list environments:", err);
    return NextResponse.json({ error: "Failed to list environments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const body = await request.json();
    if (!body.name || !body.base_url) {
      return NextResponse.json({ error: "name and base_url are required" }, { status: 400 });
    }
    // Generate a verification token for DNS-based ownership verification
    if (!body.verification_token) {
      body.verification_token = `lt-verify-${crypto.randomUUID().slice(0, 12)}`;
    }
    const { upsertEnvironment } = await import("@loadtoad/db");
    const saved = await upsertEnvironment(body);
    return NextResponse.json({ environment: saved }, { status: 201 });
  } catch (err) {
    console.error("Failed to save environment:", err);
    return NextResponse.json({ error: "Failed to save environment" }, { status: 500 });
  }
}
