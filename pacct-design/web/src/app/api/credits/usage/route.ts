import { NextResponse } from "next/server";
import type { UsageSourceType } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

const VALID_SOURCE_TYPES: UsageSourceType[] = ["run", "scenario", "analysis", "export"];

/** GET /api/credits/usage — paginated usage events */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? "default";
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
    const sourceTypeParam = url.searchParams.get("sourceType") as UsageSourceType | null;
    const sourceType = sourceTypeParam && VALID_SOURCE_TYPES.includes(sourceTypeParam) ? sourceTypeParam : undefined;

    const { listUsageEvents } = await import("@loadtoad/db");
    const result = await listUsageEvents({ orgId, limit, offset, sourceType });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to list usage events:", err);
    return NextResponse.json({ events: [], total: 0 }, { status: 200 });
  }
}
