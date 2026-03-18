import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/credits/products — list active credit products */
export async function GET() {
  try {
    const { listCreditProducts } = await import("@loadtoad/db");
    const products = await listCreditProducts();
    return NextResponse.json(products);
  } catch (err) {
    console.error("Failed to list credit products:", err);
    return NextResponse.json([], { status: 200 });
  }
}
