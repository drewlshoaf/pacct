import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** POST /api/credits/purchases/[id]/complete — complete payment + credit balance */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { paymentReference } = body as { paymentReference?: string };

    const { completePurchase } = await import("@loadtoad/db");
    const result = await completePurchase(id, paymentReference);

    if (!result) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to complete purchase:", err);
    return NextResponse.json({ error: "Failed to complete purchase" }, { status: 500 });
  }
}
