import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "sv:config:topology";

export interface TopologyConfig {
  degraded_error_pct: number;
  critical_error_pct: number;
  error_health_weight: number;
  latency_baseline_ms: number;
  latency_health_weight: number;
  health_green_above: number;
  health_yellow_above: number;
}

const DEFAULTS: TopologyConfig = {
  degraded_error_pct: 5,
  critical_error_pct: 15,
  error_health_weight: 10,
  latency_baseline_ms: 200,
  latency_health_weight: 0.15,
  health_green_above: 75,
  health_yellow_above: 40,
};

export async function GET() {
  try {
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    const raw = await redis.get(CONFIG_KEY);
    const overrides: Partial<TopologyConfig> = raw ? JSON.parse(raw) : {};

    const effective: TopologyConfig = {
      degraded_error_pct: overrides.degraded_error_pct ?? DEFAULTS.degraded_error_pct,
      critical_error_pct: overrides.critical_error_pct ?? DEFAULTS.critical_error_pct,
      error_health_weight: overrides.error_health_weight ?? DEFAULTS.error_health_weight,
      latency_baseline_ms: overrides.latency_baseline_ms ?? DEFAULTS.latency_baseline_ms,
      latency_health_weight: overrides.latency_health_weight ?? DEFAULTS.latency_health_weight,
      health_green_above: overrides.health_green_above ?? DEFAULTS.health_green_above,
      health_yellow_above: overrides.health_yellow_above ?? DEFAULTS.health_yellow_above,
    };

    return NextResponse.json({
      config: effective,
      defaults: DEFAULTS,
      has_overrides: raw !== null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to read topology config:", err);
    return NextResponse.json({ error: "Failed to read topology configuration" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<TopologyConfig>;
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();

    if (body.degraded_error_pct !== undefined && (body.degraded_error_pct < 0.5 || body.degraded_error_pct > 50)) {
      return NextResponse.json({ error: "degraded_error_pct must be between 0.5 and 50" }, { status: 400 });
    }
    if (body.critical_error_pct !== undefined && (body.critical_error_pct < 1 || body.critical_error_pct > 100)) {
      return NextResponse.json({ error: "critical_error_pct must be between 1 and 100" }, { status: 400 });
    }
    if (body.error_health_weight !== undefined && (body.error_health_weight < 1 || body.error_health_weight > 50)) {
      return NextResponse.json({ error: "error_health_weight must be between 1 and 50" }, { status: 400 });
    }
    if (body.latency_baseline_ms !== undefined && (body.latency_baseline_ms < 10 || body.latency_baseline_ms > 5000)) {
      return NextResponse.json({ error: "latency_baseline_ms must be between 10 and 5000" }, { status: 400 });
    }
    if (body.latency_health_weight !== undefined && (body.latency_health_weight < 0.01 || body.latency_health_weight > 2)) {
      return NextResponse.json({ error: "latency_health_weight must be between 0.01 and 2" }, { status: 400 });
    }
    if (body.health_green_above !== undefined && (body.health_green_above < 10 || body.health_green_above > 99)) {
      return NextResponse.json({ error: "health_green_above must be between 10 and 99" }, { status: 400 });
    }
    if (body.health_yellow_above !== undefined && (body.health_yellow_above < 5 || body.health_yellow_above > 90)) {
      return NextResponse.json({ error: "health_yellow_above must be between 5 and 90" }, { status: 400 });
    }

    const existing = await redis.get(CONFIG_KEY);
    const current: Partial<TopologyConfig> = existing ? JSON.parse(existing) : {};
    const merged = { ...current, ...body };
    await redis.set(CONFIG_KEY, JSON.stringify(merged));

    return NextResponse.json({
      config: merged,
      message: "Topology configuration updated. Changes apply immediately.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to update topology config:", err);
    return NextResponse.json({ error: "Failed to update topology configuration" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    await redis.del(CONFIG_KEY);

    return NextResponse.json({
      message: "Topology overrides cleared. Config reverted to defaults.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to reset topology config:", err);
    return NextResponse.json({ error: "Failed to reset topology configuration" }, { status: 500 });
  }
}
