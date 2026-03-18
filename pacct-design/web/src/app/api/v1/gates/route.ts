import { withApiAuth } from "@/lib/api-v1/middleware";
import { paginated, created } from "@/lib/api-v1/response";
import { validationError } from "@/lib/api-v1/errors";
import { parsePaginationParams } from "@/lib/api-v1/pagination";

export const dynamic = "force-dynamic";

/** GET /api/v1/gates — List gates, paginated. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const { limit } = parsePaginationParams(url.searchParams);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { listGates } = await import("@loadtoad/db");
  const gates = await listGates({ limit, offset });

  return paginated(gates, { cursor: null, has_more: false, total: gates.length });
});

/** POST /api/v1/gates — Create a gate. */
export const POST = withApiAuth(async (request, _ctx) => {
  const body = await request.json();

  if (!body.name) {
    return validationError("name is required");
  }
  if (!body.entity_type) {
    return validationError("entity_type is required");
  }
  if (!body.entity_id) {
    return validationError("entity_id is required");
  }

  const { upsertGate } = await import("@loadtoad/db");

  const now = new Date().toISOString();
  const gate = {
    id: crypto.randomUUID(),
    name: body.name,
    description: body.description ?? "",
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    entity_name: body.entity_name ?? "",
    conditions: body.conditions ?? [],
    enabled: body.enabled ?? true,
    retroactive: body.retroactive ?? true,
    created_at: now,
    updated_at: now,
  };

  const saved = await upsertGate(gate);
  return created(saved);
});
