import { NextResponse } from "next/server";
import type { NotificationEventType, NotificationLogStatus } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/notifications/log — paginated notification log with optional filters */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? "default";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const eventType = url.searchParams.get("eventType") as NotificationEventType | null;
    const status = url.searchParams.get("status") as NotificationLogStatus | null;

    const { listNotificationLog } = await import("@loadtoad/db");
    const result = await listNotificationLog({
      orgId,
      limit,
      offset,
      eventType: eventType || undefined,
      status: status || undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to fetch notification log:", err);
    return NextResponse.json({ entries: [], total: 0 }, { status: 200 });
  }
}
