import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/credits/purchases/[id] — single purchase detail */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { getPurchase } = await import("@loadtoad/db");
    const purchase = await getPurchase(id);

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (err) {
    console.error("Failed to fetch purchase:", err);
    return NextResponse.json({ error: "Failed to fetch purchase" }, { status: 500 });
  }
}
