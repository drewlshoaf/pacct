import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/notifications/preferences — list user notification preferences */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { listUserNotificationPrefs } = await import("@loadtoad/db");
    const prefs = await listUserNotificationPrefs(userId);
    return NextResponse.json(prefs);
  } catch (err) {
    console.error("Failed to fetch notification preferences:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/** PUT /api/notifications/preferences — bulk upsert user notification preferences */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, prefs } = body;
    if (!userId || !Array.isArray(prefs)) {
      return NextResponse.json({ error: "userId and prefs[] are required" }, { status: 400 });
    }

    const { bulkUpsertUserNotificationPrefs } = await import("@loadtoad/db");
    const result = await bulkUpsertUserNotificationPrefs(userId, prefs);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to update notification preferences:", err);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
}
