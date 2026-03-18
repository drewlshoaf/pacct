import { withApiAuth } from "@/lib/api-v1/middleware";
import { ok } from "@/lib/api-v1/response";
import { notFoundError } from "@/lib/api-v1/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/runs/:id/metrics — Time-series buckets for this run. */
export const GET = withApiAuth(async (request, _ctx) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!;

  const { getDownsampledBuckets } = await import("@loadtoad/db");

  // Verify run exists
  const { getRunArtifact } = await import("@loadtoad/db");
  const run = await getRunArtifact(id);
  if (!run) return notFoundError("Run");

  const buckets = await getDownsampledBuckets(id, 0);

  return ok({
    buckets: buckets.map((b: Record<string, unknown>) => ({
      timestamp: b.bucket_time,
      requests: Number(b.total_requests),
      errors: Number(b.total_errors),
      throughput: Number(b.avg_throughput),
      latency_p50: Number(b.avg_p50),
      latency_p95: Number(b.avg_p95),
      latency_p99: Number(b.avg_p99),
      latency_min: Number(b.min_latency),
      latency_max: Number(b.max_latency),
      timeouts: Number(b.total_timeouts),
      bytes_received: Number(b.total_bytes_received),
    })),
  });
});
