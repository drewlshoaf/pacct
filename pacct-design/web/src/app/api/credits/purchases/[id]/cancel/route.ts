import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/credits/purchases/[id]/cancel — cancel a pending purchase */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { updatePurchaseStatus } = await import("@loadtoad/db");
    const purchase = await updatePurchaseStatus(id, "canceled");

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (err) {
    console.error("Failed to cancel purchase:", err);
    return NextResponse.json({ error: "Failed to cancel purchase" }, { status: 500 });
  }
}
