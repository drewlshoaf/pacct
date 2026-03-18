import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok, noContent } from "@/lib/api-v1/response";
import { notFoundError, validationError, serverError } from "@/lib/api-v1/errors";
import type { Scenario } from "@loadtoad/schema";

export const dynamic = "force-dynamic";

function getIdFromUrl(request: Request): string {
  return new URL(request.url).pathname.split("/")[4];
}

/** GET /api/v1/scenarios/:id */
export const GET = withApiAuth(async (request, ctx) => {
  const id = getIdFromUrl(request);
  const { getScenario } = await import("@loadtoad/db");
  const scenario = await getScenario(id);
  if (!scenario) return notFoundError("Scenario");
  return ok(scenario);
});

/** PUT /api/v1/scenarios/:id */
export const PUT = withApiAuth(async (request, ctx) => {
  try {
    const id = getIdFromUrl(request);
    const { getScenario, upsertScenario } = await import("@loadtoad/db");

    const existing = await getScenario(id);
    if (!existing) return notFoundError("Scenario");

    const body = await request.json();
    const now = new Date().toISOString();

    const updated: Scenario = {
      ...existing,
      metadata: {
        ...existing.metadata,
        name: body.name ?? existing.metadata.name,
        description: body.description ?? existing.metadata.description,
        tags: body.tags ?? existing.metadata.tags,
        base_url: body.base_url ?? existing.metadata.base_url,
        global_variables: body.global_variables ?? existing.metadata.global_variables,
        secret_refs: body.secret_refs ?? existing.metadata.secret_refs,
        default_timeout_ms: body.default_timeout_ms ?? existing.metadata.default_timeout_ms,
        updated_at: now,
      },
      steps: body.steps ?? existing.steps,
      load_profile: body.load_profile ?? existing.load_profile,
      advanced: body.advanced !== undefined ? body.advanced : existing.advanced,
    };

    const saved = await upsertScenario(updated);
    return ok(saved);
  } catch (err) {
    console.error("[api-v1] Failed to update scenario:", err);
    return serverError("Failed to update scenario");
  }
});

/** DELETE /api/v1/scenarios/:id */
export const DELETE = withApiAuth(async (request, ctx) => {
  const id = getIdFromUrl(request);
  const { getScenario, deleteScenario } = await import("@loadtoad/db");

  const existing = await getScenario(id);
  if (!existing) return notFoundError("Scenario");

  await deleteScenario(id);
  return noContent();
});
