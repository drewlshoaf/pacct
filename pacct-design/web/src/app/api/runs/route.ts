import { NextResponse } from "next/server";
import path from "node:path";
import { summaryToRun } from "@/lib/adapter";
import type { RunListQuery } from "@loadtoad/artifacts";

export const dynamic = "force-dynamic";

// Resolve runs/ relative to monorepo root (two levels up from packages/web)
const RUNS_DIR = process.env.RM_RUNS_DIR || process.env.LOADTOAD_RUNS_DIR || path.resolve(process.cwd(), "../../runs");
const USE_DB = !!process.env.DATABASE_URL;

const VALID_SORTS: RunListQuery["sort"][] = ["created_at", "overall_score", "duration_seconds"];
const VALID_ORDERS: RunListQuery["order"][] = ["asc", "desc"];
const VALID_MODES = ["SCOUT", "FORENSICS"];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = url.searchParams;

    if (USE_DB) {
      const { listRuns: listRunsDb } = await import("@loadtoad/db");

      const sort = params.get("sort") as RunListQuery["sort"];
      const order = params.get("order") as RunListQuery["order"];
      const policyMode = params.get("policyMode");

      const query: RunListQuery = {
        limit: Math.min(100, Math.max(1, Number(params.get("limit")) || 25)),
        offset: Math.max(0, Number(params.get("offset")) || 0),
        sort: sort && VALID_SORTS.includes(sort) ? sort : undefined,
        order: order && VALID_ORDERS.includes(order) ? order : undefined,
        search: params.get("search") || undefined,
        policyMode: policyMode && VALID_MODES.includes(policyMode)
          ? policyMode
          : undefined,
        dateFrom: params.get("dateFrom") || undefined,
        dateTo: params.get("dateTo") || undefined,
      };

      const { runs: summaries, total } = await listRunsDb(query);
      const runs = summaries.map(summaryToRun);
      return NextResponse.json({ runs, total, limit: query.limit, offset: query.offset });
    }

    // Filesystem fallback — apply sorting/filtering/pagination in-memory
    const { listRuns: listRunsFs } = await import("@loadtoad/artifacts");
    const allSummaries = await listRunsFs(RUNS_DIR);

    const searchTerm = (params.get("search") || "").toLowerCase();
    const policyMode = params.get("policyMode");

    let filtered = allSummaries;
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.id.toLowerCase().includes(searchTerm) ||
        (s.scenario_name || "").toLowerCase().includes(searchTerm)
      );
    }
    if (policyMode && VALID_MODES.includes(policyMode)) {
      filtered = filtered.filter(s => s.policy_mode === policyMode);
    }

    const sort = params.get("sort") as RunListQuery["sort"];
    const order = params.get("order") as RunListQuery["order"];
    const sortKey = sort && VALID_SORTS.includes(sort) ? sort : "created_at";
    const sortDir = order && VALID_ORDERS.includes(order) ? order : "desc";

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "created_at":
          cmp = a.created_at.localeCompare(b.created_at);
          break;
        case "overall_score":
          cmp = a.overall_score - b.overall_score;
          break;
        case "duration_seconds":
          cmp = a.duration_seconds - b.duration_seconds;
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    const total = filtered.length;
    const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 25));
    const offset = Math.max(0, Number(params.get("offset")) || 0);
    const page = filtered.slice(offset, offset + limit);
    const runs = page.map(summaryToRun);

    return NextResponse.json({ runs, total, limit, offset });
  } catch (err) {
    console.error("Failed to list runs:", err);
    return NextResponse.json({ runs: [], total: 0, limit: 25, offset: 0 }, { status: 200 });
  }
}
