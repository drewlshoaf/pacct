import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok, noContent } from "@/lib/api-v1/response";
import { notFoundError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/gates/:id — Get a single gate. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1)!;

  const { getGate } = await import("@loadtoad/db");
  const gate = await getGate(id);
  if (!gate) return notFoundError("Gate");

  return ok(gate);
});

/** PUT /api/v1/gates/:id — Update a gate. */
export const PUT = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1)!;

  const { getGate, upsertGate } = await import("@loadtoad/db");
  const existing = await getGate(id);
  if (!existing) return notFoundError("Gate");

  const body = await request.json();

  const updated = {
    ...existing,
    name: body.name ?? existing.name,
    description: body.description ?? existing.description,
    entity_type: body.entity_type ?? existing.entity_type,
    entity_id: body.entity_id ?? existing.entity_id,
    entity_name: body.entity_name ?? existing.entity_name,
    conditions: body.conditions ?? existing.conditions,
    enabled: body.enabled ?? existing.enabled,
    retroactive: body.retroactive ?? existing.retroactive,
    updated_at: new Date().toISOString(),
  };

  const saved = await upsertGate(updated);
  return ok(saved);
});

/** DELETE /api/v1/gates/:id — Delete a gate. */
export const DELETE = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1)!;

  const { deleteGate } = await import("@loadtoad/db");
  const deleted = await deleteGate(id);
  if (!deleted) return notFoundError("Gate");

  return noContent();
});
