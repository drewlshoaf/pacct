import { getRedisConnection } from "@loadtoad/queue";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding-window rate limiter using a Redis sorted set.
 * Scores are Unix timestamps in ms; members are unique request IDs.
 */
export async function checkRateLimit(keyId: string): Promise<RateLimitResult> {
  const redis = getRedisConnection();
  const redisKey = `ratelimit:${keyId}`;

  const now = Date.now();
  const windowStart = now - WINDOW_SECONDS * 1000;
  const resetAt = Math.ceil((now + WINDOW_SECONDS * 1000) / 1000);

  // Pipeline: remove expired entries, add current, count, set TTL
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, now, `${now}:${Math.random().toString(36).slice(2, 10)}`);
  pipeline.zcard(redisKey);
  pipeline.expire(redisKey, WINDOW_SECONDS + 1);

  const results = await pipeline.exec();
  // zcard result is at index 2: [err, count]
  const count = (results?.[2]?.[1] as number) ?? 0;
  const remaining = Math.max(0, MAX_REQUESTS - count);

  return {
    allowed: count <= MAX_REQUESTS,
    remaining,
    resetAt,
  };
}
