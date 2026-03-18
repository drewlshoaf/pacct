import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Redis key where runtime AI model config overrides are stored.
 * Workers read this at the start of each run so changes take effect
 * without restarting containers.
 */
const CONFIG_KEY = "sv:config:models";

/** Known model options per provider. */
const KNOWN_MODELS: Record<string, string[]> = {
  claude: [
    "claude-sonnet-4-20250514",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-20250514",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
};

const ALL_MODELS = Object.values(KNOWN_MODELS).flat();

export interface ModelConfig {
  provider: "claude" | "openai";
  model: string;
  delay_ms: number;
}

/** Infer default provider from env vars. */
function inferDefaultProvider(): "claude" | "openai" {
  const model = process.env.LOADTOAD_MODEL;
  if (model) {
    if (model.startsWith("gpt-") || model.startsWith("o1-") || model.startsWith("o3-") || model.startsWith("o4-") || model.startsWith("chatgpt-")) {
      return "openai";
    }
    return "claude";
  }
  if (process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) return "openai";
  return "claude";
}

function getDefaults(): ModelConfig {
  const provider = inferDefaultProvider();
  return {
    provider,
    model: process.env.LOADTOAD_MODEL || "claude-sonnet-4-20250514",
    delay_ms: process.env.LOADTOAD_DELAY_MS ? parseInt(process.env.LOADTOAD_DELAY_MS, 10) : 0,
  };
}

/**
 * GET /api/admin/models — read current AI model config.
 *
 * Returns the merged result of defaults + env vars + any runtime overrides
 * stored in Redis.
 */
export async function GET() {
  try {
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();

    const raw = await redis.get(CONFIG_KEY);
    const overrides: Partial<ModelConfig> = raw ? JSON.parse(raw) : {};
    const defaults = getDefaults();

    const effective: ModelConfig = {
      provider: overrides.provider ?? defaults.provider,
      model: overrides.model ?? defaults.model,
      delay_ms: overrides.delay_ms ?? defaults.delay_ms,
    };

    return NextResponse.json({
      config: effective,
      defaults,
      has_overrides: raw !== null,
      known_models: KNOWN_MODELS,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to read model config:", err);
    return NextResponse.json(
      { error: "Failed to read model configuration" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/models — update runtime AI model config overrides.
 *
 * Writes to Redis so changes take effect on the *next* run without
 * restarting workers.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ModelConfig>;
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();

    // Validate provider
    if (body.provider !== undefined) {
      if (body.provider !== "claude" && body.provider !== "openai") {
        return NextResponse.json(
          { error: 'provider must be "claude" or "openai"' },
          { status: 400 },
        );
      }
    }

    // Validate model
    if (body.model !== undefined) {
      if (!ALL_MODELS.includes(body.model)) {
        return NextResponse.json(
          { error: `Unknown model "${body.model}". Known models: ${ALL_MODELS.join(", ")}` },
          { status: 400 },
        );
      }
    }

    // Validate delay_ms
    if (body.delay_ms !== undefined) {
      if (body.delay_ms < 0 || body.delay_ms > 60000) {
        return NextResponse.json(
          { error: "delay_ms must be between 0 and 60000" },
          { status: 400 },
        );
      }
    }

    // Merge with existing overrides
    const existing = await redis.get(CONFIG_KEY);
    const current: Partial<ModelConfig> = existing ? JSON.parse(existing) : {};
    const merged = { ...current, ...body };

    await redis.set(CONFIG_KEY, JSON.stringify(merged));

    return NextResponse.json({
      config: merged,
      message: "Model configuration updated. Changes apply to the next run.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to update model config:", err);
    return NextResponse.json(
      { error: "Failed to update model configuration" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/models — reset all runtime overrides.
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
    console.error("Failed to reset model config:", err);
    return NextResponse.json(
      { error: "Failed to reset model configuration" },
      { status: 500 },
    );
  }
}
