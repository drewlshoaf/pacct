import { NextResponse } from "next/server";
import type { Plan } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/plans — list user-created plans (excludes Auto plans) */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const scheduleType = url.searchParams.get("scheduleType") || "";

    const { listPlans, listPlanRuns } = await import("@loadtoad/db");
    let plans = await listPlans({ limit: 200 });

    // Exclude auto-generated plans
    plans = plans.filter(p => !p.name.endsWith("(Auto)"));

    // Search filter
    if (search) {
      const term = search.toLowerCase();
      plans = plans.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term),
      );
    }

    // Status filter
    if (status && (status === "active" || status === "paused")) {
      plans = plans.filter(p => p.status === status);
    }

    // Schedule type filter
    if (scheduleType) {
      plans = plans.filter(p => p.schedule.type === scheduleType);
    }

    const total = plans.length;
    const page = plans.slice(offset, offset + limit);

    // Enrich with last_run info
    const enriched = await Promise.all(
      page.map(async (plan) => {
        const runs = await listPlanRuns(plan.id, 1);
        const lastRun = runs[0] ?? null;
        return {
          ...plan,
          scenario_count: plan.scenario_ids.length,
          last_run_at: lastRun?.completed_at ?? lastRun?.started_at ?? null,
          last_run_status: lastRun?.status ?? null,
        };
      }),
    );

    return NextResponse.json({ plans: enriched, total, limit, offset });
  } catch (err) {
    console.error("Failed to list plans:", err);
    return NextResponse.json({ plans: [], total: 0, limit: 50, offset: 0 }, { status: 200 });
  }
}

/** POST /api/plans — create a new plan */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Plan;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    const { upsertPlan } = await import("@loadtoad/db");
    const saved = await upsertPlan(body);

    // Sync schedule if active and has recurring/once schedule
    if (saved.schedule.type !== "manual" && saved.schedule.type !== "on_deploy") {
      const { syncPlanSchedule } = await import("@loadtoad/queue");
      await syncPlanSchedule(saved.id, saved.schedule, saved.status === "active");
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("Failed to create plan:", err);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
