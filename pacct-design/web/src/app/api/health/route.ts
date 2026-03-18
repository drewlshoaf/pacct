import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/health — system health check */
export async function GET() {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Check database
  if (process.env.DATABASE_URL) {
    try {
      const { getClient } = await import("@loadtoad/db");
      const sql = getClient();
      await sql`SELECT 1`;
      checks.database = "connected";
    } catch {
      checks.database = "unreachable";
      healthy = false;
    }
  } else {
    checks.database = "not_configured";
  }

  // Check Redis
  if (process.env.REDIS_URL) {
    try {
      const { getRedisConnection } = await import("@loadtoad/queue");
      const redis = getRedisConnection();
      await redis.ping();
      checks.redis = "connected";
    } catch {
      checks.redis = "unreachable";
      healthy = false;
    }
  } else {
    checks.redis = "not_configured";
  }

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      ...checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
