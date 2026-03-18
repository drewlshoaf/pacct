import { createHash } from "node:crypto";
import { findApiKeyByHash, touchApiKeyLastUsed } from "@loadtoad/db";

export interface ApiAuthContext {
  orgId: string;
  keyId: string;
  scopes: string[];
}

/**
 * Authenticate an incoming request via API key.
 * Throws an object with `status` and `code` fields on failure.
 */
export async function authenticateApiKey(request: Request): Promise<ApiAuthContext> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw { status: 401, code: "authentication_error", message: "Missing or invalid Authorization header" };
  }

  const token = header.slice(7);
  if (!token.startsWith("rm_live_")) {
    throw { status: 401, code: "authentication_error", message: "Invalid API key format" };
  }

  const keyHash = createHash("sha256").update(token).digest("hex");
  const row = await findApiKeyByHash(keyHash);

  if (!row) {
    throw { status: 401, code: "authentication_error", message: "Invalid, expired, or revoked API key" };
  }

  // Fire-and-forget: update last_used_at without blocking
  touchApiKeyLastUsed(row.id);

  return {
    orgId: row.org_id,
    keyId: row.id,
    scopes: row.scopes as string[],
  };
}
