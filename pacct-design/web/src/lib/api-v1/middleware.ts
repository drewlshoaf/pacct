import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authenticateApiKey, type ApiAuthContext } from "./auth";
import { checkRateLimit } from "./rate-limit";
import {
  authenticationError,
  authorizationError,
  rateLimitError,
  serverError,
} from "./errors";

export interface ApiContext extends ApiAuthContext {
  requestId: string;
}

type ApiHandler = (
  request: Request,
  context: ApiContext,
) => Promise<NextResponse>;

/**
 * Composed middleware wrapper for /api/v1 routes.
 * Handles auth, rate limiting, request ID, and error formatting.
 */
export function withApiAuth(handler: ApiHandler) {
  return async (request: Request): Promise<NextResponse> => {
    const requestId = randomUUID();

    try {
      // Authenticate
      let auth: ApiAuthContext;
      try {
        auth = await authenticateApiKey(request);
      } catch (err: unknown) {
        const e = err as { status?: number; code?: string; message?: string };
        if (e.status === 401) return authenticationError(e.message);
        if (e.status === 403) return authorizationError(e.message);
        return authenticationError();
      }

      // Rate limit
      const rateResult = await checkRateLimit(auth.keyId);
      if (!rateResult.allowed) {
        const retryAfter = Math.max(1, Math.ceil((rateResult.resetAt * 1000 - Date.now()) / 1000));
        return rateLimitError(retryAfter);
      }

      // Call handler
      const response = await handler(request, {
        ...auth,
        requestId,
      });

      // Attach standard headers
      response.headers.set("X-Request-Id", requestId);
      response.headers.set("X-RateLimit-Limit", "100");
      response.headers.set("X-RateLimit-Remaining", String(rateResult.remaining));
      response.headers.set("X-RateLimit-Reset", String(rateResult.resetAt));

      return response;
    } catch (err) {
      console.error("[api-v1] Unhandled error:", err);
      const resp = serverError();
      resp.headers.set("X-Request-Id", requestId);
      return resp;
    }
  };
}
