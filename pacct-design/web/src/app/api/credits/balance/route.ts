import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/credits/balance — current balance + KPIs */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? "default";

    const { getCreditBalance, getCreditKpis } = await import("@loadtoad/db");
    const [balance, kpis] = await Promise.all([
      getCreditBalance(orgId),
      getCreditKpis(orgId),
    ]);

    return NextResponse.json({ balance, kpis });
  } catch (err) {
    console.error("Failed to fetch credit balance:", err);
    return NextResponse.json({ balance: null, kpis: null }, { status: 200 });
  }
}
