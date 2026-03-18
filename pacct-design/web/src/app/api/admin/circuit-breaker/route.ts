import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Redis key where runtime circuit breaker config overrides are stored.
 * Workers read this at the start of each run so changes take effect
 * without restarting containers.
 */
const CONFIG_KEY = "sv:config:circuit-breaker";

/** Default values — must match packages/executor/src/circuit-breaker.ts */
const DEFAULTS = {
  cb_enabled: true,
  cb_error_rate_threshold: 95,
  cb_consecutive_breaches: 3,
  cb_no_response_timeout_s: 30,
  cb_min_requests: 10,
  cb_grace_period_s: 15,
};

export interface CircuitBreakerConfig {
  cb_enabled: boolean;
  cb_error_rate_threshold: number;
  cb_consecutive_breaches: number;
  cb_no_response_timeout_s: number;
  cb_min_requests: number;
  cb_grace_period_s: number;
}

/**
 * GET /api/admin/circuit-breaker — read current circuit breaker config.
 *
 * Returns the merged result of defaults + any runtime overrides stored in Redis.
 */
export async function GET() {
  try {
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();

    const raw = await redis.get(CONFIG_KEY);
    const overrides: Partial<CircuitBreakerConfig> = raw ? JSON.parse(raw) : {};

    const effective: CircuitBreakerConfig = {
      cb_enabled: overrides.cb_enabled ?? DEFAULTS.cb_enabled,
      cb_error_rate_threshold:
        overrides.cb_error_rate_threshold ?? DEFAULTS.cb_error_rate_threshold,
      cb_consecutive_breaches:
        overrides.cb_consecutive_breaches ?? DEFAULTS.cb_consecutive_breaches,
      cb_no_response_timeout_s:
        overrides.cb_no_response_timeout_s ?? DEFAULTS.cb_no_response_timeout_s,
      cb_min_requests:
        overrides.cb_min_requests ?? DEFAULTS.cb_min_requests,
      cb_grace_period_s:
        overrides.cb_grace_period_s ?? DEFAULTS.cb_grace_period_s,
    };

    return NextResponse.json({
      config: effective,
      defaults: DEFAULTS,
      has_overrides: raw !== null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to read circuit breaker config:", err);
    return NextResponse.json(
      { error: "Failed to read circuit breaker configuration" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/circuit-breaker — update runtime circuit breaker config overrides.
 *
 * Writes to Redis so changes take effect on the *next* run without
 * restarting workers.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CircuitBreakerConfig>;
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();

    // Validate fields
    if (body.cb_error_rate_threshold !== undefined) {
      if (body.cb_error_rate_threshold < 1 || body.cb_error_rate_threshold > 100) {
        return NextResponse.json(
          { error: "cb_error_rate_threshold must be between 1 and 100" },
          { status: 400 },
        );
      }
    }
    if (body.cb_consecutive_breaches !== undefined) {
      if (body.cb_consecutive_breaches < 1 || body.cb_consecutive_breaches > 20) {
        return NextResponse.json(
          { error: "cb_consecutive_breaches must be between 1 and 20" },
          { status: 400 },
        );
      }
    }
    if (body.cb_no_response_timeout_s !== undefined) {
      if (body.cb_no_response_timeout_s < 5 || body.cb_no_response_timeout_s > 300) {
        return NextResponse.json(
          { error: "cb_no_response_timeout_s must be between 5 and 300" },
          { status: 400 },
        );
      }
    }
    if (body.cb_min_requests !== undefined) {
      if (body.cb_min_requests < 1 || body.cb_min_requests > 1000) {
        return NextResponse.json(
          { error: "cb_min_requests must be between 1 and 1000" },
          { status: 400 },
        );
      }
    }
    if (body.cb_grace_period_s !== undefined) {
      if (body.cb_grace_period_s < 0 || body.cb_grace_period_s > 120) {
        return NextResponse.json(
          { error: "cb_grace_period_s must be between 0 and 120" },
          { status: 400 },
        );
      }
    }

    // Merge with existing overrides
    const existing = await redis.get(CONFIG_KEY);
    const current: Partial<CircuitBreakerConfig> = existing ? JSON.parse(existing) : {};
    const merged = { ...current, ...body };

    await redis.set(CONFIG_KEY, JSON.stringify(merged));

    return NextResponse.json({
      config: merged,
      message: "Circuit breaker configuration updated. Changes apply to the next run.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to update circuit breaker config:", err);
    return NextResponse.json(
      { error: "Failed to update circuit breaker configuration" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/circuit-breaker — reset all runtime overrides.
 * Config reverts to defaults.
 */
export async function DELETE() {
  try {
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    await redis.del(CONFIG_KEY);

    return NextResponse.json({
      message: "Circuit breaker overrides cleared. Config reverted to defaults.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to reset circuit breaker config:", err);
    return NextResponse.json(
      { error: "Failed to reset circuit breaker configuration" },
      { status: 500 },
    );
  }
}
