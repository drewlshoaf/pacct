import { getRedisConnection } from "@loadtoad/queue";

const TTL_SECONDS = 86400; // 24 hours

function buildKey(keyHash: string, idempotencyKey: string): string {
  return `idempotency:${keyHash}:${idempotencyKey}`;
}

export async function getIdempotentResponse(
  keyHash: string,
  idempotencyKey: string,
): Promise<object | null> {
  const redis = getRedisConnection();
  const raw = await redis.get(buildKey(keyHash, idempotencyKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as object;
  } catch {
    return null;
  }
}

export async function storeIdempotentResponse(
  keyHash: string,
  idempotencyKey: string,
  response: object,
): Promise<void> {
  const redis = getRedisConnection();
  await redis.set(
    buildKey(keyHash, idempotencyKey),
    JSON.stringify(response),
    "EX",
    TTL_SECONDS,
  );
}
