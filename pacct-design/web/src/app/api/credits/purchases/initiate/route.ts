import { NextResponse } from "next/server";
import type { PaymentMethod, AppliedDiscount } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** POST /api/credits/purchases/initiate — start a new purchase */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, paymentMethod, orgId = "default" } = body as {
      productId: string;
      paymentMethod: PaymentMethod;
      orgId?: string;
    };

    if (!productId || !paymentMethod) {
      return NextResponse.json({ error: "productId and paymentMethod are required" }, { status: 400 });
    }

    const { getCreditProduct, createPurchase } = await import("@loadtoad/db");
    const product = await getCreditProduct(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Compute discounts (deterministic precedence)
    const discounts: AppliedDiscount[] = [];
    let finalPriceCents = product.list_price_cents;

    // Volume discount for larger packs
    if (product.credits >= 5000) {
      const volumeDiscount: AppliedDiscount = {
        type: "volume",
        label: "Volume discount",
        percent_off: 10,
        amount_off_cents: Math.round(product.list_price_cents * 0.10),
      };
      discounts.push(volumeDiscount);
      finalPriceCents -= volumeDiscount.amount_off_cents;
    } else if (product.credits >= 1000) {
      const volumeDiscount: AppliedDiscount = {
        type: "volume",
        label: "Volume discount",
        percent_off: 5,
        amount_off_cents: Math.round(product.list_price_cents * 0.05),
      };
      discounts.push(volumeDiscount);
      finalPriceCents -= volumeDiscount.amount_off_cents;
    }

    // Bitcoin discount
    if (paymentMethod === "bitcoin") {
      const btcDiscount: AppliedDiscount = {
        type: "promo",
        label: "Bitcoin payment discount",
        percent_off: 3,
        amount_off_cents: Math.round(finalPriceCents * 0.03),
      };
      discounts.push(btcDiscount);
      finalPriceCents -= btcDiscount.amount_off_cents;
    }

    const purchase = await createPurchase({
      org_id: orgId,
      product_id: productId,
      credits: product.credits,
      list_price_cents: product.list_price_cents,
      final_price_cents: Math.max(0, finalPriceCents),
      discounts,
      payment_method: paymentMethod,
      status: "initiated",
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (err) {
    console.error("Failed to initiate purchase:", err);
    return NextResponse.json({ error: "Failed to initiate purchase" }, { status: 500 });
  }
}
