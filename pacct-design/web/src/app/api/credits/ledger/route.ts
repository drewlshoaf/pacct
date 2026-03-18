import { NextResponse } from "next/server";
import type { LedgerEntryType } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

const VALID_ENTRY_TYPES: LedgerEntryType[] = [
  "purchase_credit", "usage_debit", "promo_credit",
  "refund_credit", "manual_adjustment", "expiration_debit",
];

/** GET /api/credits/ledger — paginated ledger entries */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? "default";
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "25", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
    const entryTypeParam = url.searchParams.get("entryType") as LedgerEntryType | null;
    const entryType = entryTypeParam && VALID_ENTRY_TYPES.includes(entryTypeParam) ? entryTypeParam : undefined;

    const { listLedgerEntries } = await import("@loadtoad/db");
    const result = await listLedgerEntries({ orgId, limit, offset, entryType });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to list ledger entries:", err);
    return NextResponse.json({ entries: [], total: 0 }, { status: 200 });
  }
}
