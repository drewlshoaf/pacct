import { randomUUID } from "node:crypto";
import { withApiAuth } from "@/lib/api-v1/middleware";
import { paginated, created } from "@/lib/api-v1/response";
import { validationError, serverError } from "@/lib/api-v1/errors";
import { parsePaginationParams, encodeCursor } from "@/lib/api-v1/pagination";
import type { Scenario } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

/** GET /api/v1/scenarios — list scenarios */
export const GET = withApiAuth(async (request, ctx) => {
  const url = new URL(request.url);
  const { limit, cursor } = parsePaginationParams(url.searchParams);
  const tag = url.searchParams.get("tag") || undefined;

  const { listScenarios } = await import("@loadtoad/db");
  const all = await listScenarios({ limit: 10000 });

  // Filter by tag if provided
  let items = tag
    ? all.filter((s) => (s.metadata.tags as string[]).includes(tag))
    : all;

  const total = items.length;

  // Apply cursor: skip items up to and including the cursor id
  if (cursor) {
    const idx = items.findIndex((s) => s.metadata.id === cursor.id);
    if (idx >= 0) items = items.slice(idx + 1);
  }

  const page = items.slice(0, limit);
  const has_more = items.length > limit;
  const nextCursor =
    has_more && page.length > 0
      ? encodeCursor({
          id: page[page.length - 1].metadata.id,
          created_at: page[page.length - 1].metadata.created_at,
        })
      : null;

  return paginated(page, { cursor: nextCursor, has_more, total });
});

/** POST /api/v1/scenarios — create a scenario */
export const POST = withApiAuth(async (request, ctx) => {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return validationError("name is required");
    }
    if (!body.steps || !Array.isArray(body.steps) || body.steps.length === 0) {
      return validationError("steps is required and must be a non-empty array");
    }

    const now = new Date().toISOString();
    const scenario: Scenario = {
      metadata: {
        id: randomUUID(),
        name: body.name,
        description: body.description ?? "",
        tags: body.tags ?? [],
        base_url: body.base_url ?? "",
        version: 1,
        owner: ctx.orgId,
        created_at: now,
        updated_at: now,
        global_variables: body.global_variables ?? [],
        secret_refs: body.secret_refs ?? [],
        default_timeout_ms: body.default_timeout_ms ?? 30000,
      },
      steps: body.steps,
      load_profile: body.load_profile ?? {
        virtual_users: 1,
        duration: { type: "fixed", fixed: { seconds: 60 } },
        pattern: { type: "constant" },
      },
      advanced: body.advanced ?? undefined,
    };

    const { upsertScenario } = await import("@loadtoad/db");
    const saved = await upsertScenario(scenario);
    return created(saved);
  } catch (err) {
    console.error("[api-v1] Failed to create scenario:", err);
    return serverError("Failed to create scenario");
  }
});
