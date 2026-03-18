import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/credits/purchases — paginated purchase history */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? "default";
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));

    const { listPurchases } = await import("@loadtoad/db");
    const result = await listPurchases({ orgId, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to list purchases:", err);
    return NextResponse.json({ purchases: [], total: 0 }, { status: 200 });
  }
}
