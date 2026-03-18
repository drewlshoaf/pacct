import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/notifications/rules — list workspace notification rules */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? "default";

    const { listWorkspaceNotificationRules } = await import("@loadtoad/db");
    const rules = await listWorkspaceNotificationRules(orgId);
    return NextResponse.json(rules);
  } catch (err) {
    console.error("Failed to fetch workspace notification rules:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/** PUT /api/notifications/rules — bulk upsert workspace notification rules */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { orgId, rules } = body;
    if (!orgId || !Array.isArray(rules)) {
      return NextResponse.json({ error: "orgId and rules[] are required" }, { status: 400 });
    }

    const { bulkUpsertWorkspaceNotificationRules } = await import("@loadtoad/db");
    const result = await bulkUpsertWorkspaceNotificationRules(orgId, rules);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to update workspace notification rules:", err);
    return NextResponse.json({ error: "Failed to save rules" }, { status: 500 });
  }
}
