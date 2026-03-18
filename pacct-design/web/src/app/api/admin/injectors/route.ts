import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Redis key where runtime injector config overrides are stored.
 * Workers read this at the start of each run so changes take effect
 * without restarting containers.
 */
const CONFIG_KEY = "sv:config:injectors";

/** Default values — must match packages/executor/src/config.ts */
const DEFAULTS = {
  vus_per_injector: 250,
  max_injectors: 10,
  max_runs: 2,
  segment_concurrency: 10,
  worker_lock_duration_ms: 660_000,
  worker_replicas: 3,
  worker_cpu_limit: "2.0",
  worker_mem_limit: "2G",
};

export interface InjectorConfig {
  vus_per_injector: number;
  max_injectors: number;
  max_runs: number;
  segment_concurrency: number;
  worker_lock_duration_ms: number;
  worker_replicas: number;
  worker_cpu_limit: string;
  worker_mem_limit: string;
}

/**
 * GET /api/admin/injectors — read current injector scaling config.
 *
 * Returns the merged result of defaults + env vars + any runtime overrides
 * stored in Redis. The response includes a `source` field per value so the
 * UI can show where each setting comes from.
 */
export async function GET() {
  try {
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();

    // Read runtime overrides from Redis
    const raw = await redis.get(CONFIG_KEY);
    const overrides: Partial<InjectorConfig> = raw ? JSON.parse(raw) : {};

    // Build effective config: defaults ← env vars ← Redis overrides
    const effective: InjectorConfig = {
      vus_per_injector:
        overrides.vus_per_injector ??
        intEnv("LT_VUS_PER_INJECTOR", DEFAULTS.vus_per_injector),
      max_injectors:
        overrides.max_injectors ??
        intEnv("LT_MAX_INJECTORS", DEFAULTS.max_injectors),
      max_runs:
        overrides.max_runs ??
        intEnv("LT_MAX_RUNS", DEFAULTS.max_runs),
      segment_concurrency:
        overrides.segment_concurrency ??
        intEnv("LT_SEGMENT_CONCURRENCY", DEFAULTS.segment_concurrency),
      worker_lock_duration_ms:
        overrides.worker_lock_duration_ms ??
        intEnv("LT_WORKER_LOCK_DURATION_MS", DEFAULTS.worker_lock_duration_ms),
      worker_replicas:
        overrides.worker_replicas ??
        intEnv("LT_WORKER_REPLICAS", DEFAULTS.worker_replicas),
      worker_cpu_limit:
        overrides.worker_cpu_limit ??
        (process.env.LT_WORKER_CPU_LIMIT || DEFAULTS.worker_cpu_limit),
      worker_mem_limit:
        overrides.worker_mem_limit ??
        (process.env.LT_WORKER_MEM_LIMIT || DEFAULTS.worker_mem_limit),
    };

    return NextResponse.json({
      config: effective,
      defaults: DEFAULTS,
      has_overrides: raw !== null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to read injector config:", err);
    return NextResponse.json(
      { error: "Failed to read injector configuration" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/injectors — update runtime injector config overrides.
 *
 * Writes to Redis so changes take effect on the *next* run without
 * restarting workers. Note: worker_replicas, worker_cpu_limit, and
 * worker_mem_limit require a Docker Compose re-deploy to take effect.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<InjectorConfig>;
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();

    // Validate numeric fields
    if (body.vus_per_injector !== undefined) {
      if (body.vus_per_injector < 50 || body.vus_per_injector > 2000) {
        return NextResponse.json(
          { error: "vus_per_injector must be between 50 and 2000" },
          { status: 400 },
        );
      }
    }
    if (body.max_injectors !== undefined) {
      if (body.max_injectors < 1 || body.max_injectors > 50) {
        return NextResponse.json(
          { error: "max_injectors must be between 1 and 50" },
          { status: 400 },
        );
      }
    }
    if (body.max_runs !== undefined) {
      if (body.max_runs < 1 || body.max_runs > 20) {
        return NextResponse.json(
          { error: "max_runs must be between 1 and 20" },
          { status: 400 },
        );
      }
    }
    if (body.segment_concurrency !== undefined) {
      if (body.segment_concurrency < 1 || body.segment_concurrency > 20) {
        return NextResponse.json(
          { error: "segment_concurrency must be between 1 and 20" },
          { status: 400 },
        );
      }
    }

    // Merge with existing overrides
    const existing = await redis.get(CONFIG_KEY);
    const current: Partial<InjectorConfig> = existing ? JSON.parse(existing) : {};
    const merged = { ...current, ...body };

    await redis.set(CONFIG_KEY, JSON.stringify(merged));

    return NextResponse.json({
      config: merged,
      message: "Injector configuration updated. Changes apply to the next run.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to update injector config:", err);
    return NextResponse.json(
      { error: "Failed to update injector configuration" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/injectors — reset all runtime overrides.
 * Config reverts to env vars / defaults.
 */
export async function DELETE() {
  try {
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    await redis.del(CONFIG_KEY);

    return NextResponse.json({
      message: "Runtime overrides cleared. Config reverted to env vars / defaults.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to reset injector config:", err);
    return NextResponse.json(
      { error: "Failed to reset injector configuration" },
      { status: 500 },
    );
  }
}

function intEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
