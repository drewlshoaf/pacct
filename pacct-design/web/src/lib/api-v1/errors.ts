import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  const requestId = randomUUID();
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
        request_id: requestId,
      },
    },
    {
      status,
      headers: { "X-Request-Id": requestId },
    },
  );
}

export function apiError(code: string, message: string, status: number, details?: unknown) {
  return errorResponse(code, message, status, details);
}

export function validationError(message: string, details?: unknown) {
  return errorResponse("validation_error", message, 400, details);
}

export function authenticationError(message = "Missing or invalid API key") {
  return errorResponse("authentication_error", message, 401);
}

export function authorizationError(message = "Insufficient permissions") {
  return errorResponse("authorization_error", message, 403);
}

export function notFoundError(resource = "Resource") {
  return errorResponse("not_found", `${resource} not found`, 404);
}

export function conflictError(message = "Conflict") {
  return errorResponse("conflict", message, 409);
}

export function rateLimitError(retryAfter: number) {
  const requestId = randomUUID();
  return NextResponse.json(
    {
      error: {
        code: "rate_limit_exceeded",
        message: "Too many requests",
        request_id: requestId,
      },
    },
    {
      status: 429,
      headers: {
        "X-Request-Id": requestId,
        "Retry-After": String(retryAfter),
      },
    },
  );
}

export function serverError(message = "Internal server error") {
  return errorResponse("server_error", message, 500);
}
