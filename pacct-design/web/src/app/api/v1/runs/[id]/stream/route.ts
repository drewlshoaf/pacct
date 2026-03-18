import { createHash } from "node:crypto";
import type { RunProgress, LiveMetric } from "@loadtoad/queue";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/runs/:id/stream — SSE endpoint for live run monitoring.
 *
 * Transforms internal events into customer API format:
 *   - status(phase:starting)  → run.started
 *   - status(phase:running)   → run.updated
 *   - status(state:completed) → run.completed
 *   - status(state:failed)    → run.failed
 *   - status(state:canceled)  → run.canceled
 *   - metric → metrics.throughput + metrics.latency + metrics.failures + metrics.volume
 *
 * Authenticates via Authorization header or ?api_key= query param (SSE/EventSource fallback).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;

  // ── Authenticate ─────────────────────────────────────────────────────
  const authResult = await authenticateSSE(request);
  if (!authResult.ok) {
    return new Response(JSON.stringify({ error: { code: "authentication_error", message: authResult.message } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── SSE Stream ───────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      // ── Subscribe to live metrics via Redis pub/sub ──────────────
      const { getRunQueue, subscribeLiveMetrics } = await import("@loadtoad/queue");
      let metricUnsub: (() => Promise<void>) | null = null;
      let metricBuffer: LiveMetric[] = [];
      let aggregateInterval: ReturnType<typeof setInterval> | null = null;

      const flushMetrics = () => {
        if (metricBuffer.length === 0) return;
        const m = aggregateLiveMetrics(metricBuffer);
        metricBuffer = [];

        // Split into separate customer API events
        send("metrics.throughput", {
          timestamp: m.timestamp,
          rps: m.rps,
          vus: m.vus,
        });
        send("metrics.latency", {
          timestamp: m.timestamp,
          p50_ms: m.latency_p50,
          p95_ms: m.latency_p95,
          p99_ms: m.latency_p99,
        });
        send("metrics.failures", {
          timestamp: m.timestamp,
          error_rate: m.error_rate,
          timeout_count: m.timeout_count ?? 0,
        });
        send("metrics.volume", {
          timestamp: m.timestamp,
          bytes_received: m.bytes_received ?? 0,
          bytes_sent: m.bytes_sent ?? 0,
        });
      };

      try {
        const { unsubscribe, ready } = subscribeLiveMetrics(
          runId,
          (metric: LiveMetric) => {
            metricBuffer.push(metric);
          },
        );
        await ready;
        metricUnsub = unsubscribe;
        aggregateInterval = setInterval(flushMetrics, 2000);
      } catch {
        // Redis not available — continue without live metrics
      }

      // ── Poll BullMQ for status updates ─────────────────────────
      const queue = getRunQueue();
      let lastPhase = "";
      let cachedJobId: string | null = null;

      const pollStatus = async () => {
        if (closed) return;

        try {
          let job = cachedJobId ? await queue.getJob(cachedJobId) : null;

          if (!job || job.data?.run_id !== runId) {
            const jobs = await queue.getJobs(
              ["active", "waiting", "delayed", "completed", "failed"],
              0,
              100,
            );
            job = jobs.find((j) => j.data?.run_id === runId) ?? null;
            if (job?.id) cachedJobId = job.id;
          }

          if (!job) return;

          const state = await job.getState();
          const rawProgress = job.progress;
          const progress: RunProgress | undefined =
            rawProgress &&
            typeof rawProgress === "object" &&
            "phase" in rawProgress
              ? (rawProgress as RunProgress)
              : undefined;

          // Derive phase
          let phase: string;
          if (state === "waiting" || state === "delayed") {
            phase = "queued";
          } else if (state === "active") {
            phase =
              progress?.phase && progress.phase !== "failed"
                ? progress.phase
                : "starting";
          } else if (state === "completed") {
            phase = "completed";
          } else if (state === "failed") {
            phase = "failed";
          } else {
            phase = state;
          }

          // Map to customer API events
          if (phase !== lastPhase) {
            lastPhase = phase;

            if (phase === "starting" || phase === "queued") {
              send("run.started", {
                run_id: runId,
                phase,
                progress_pct: progress?.progress_pct ?? 0,
              });
            } else if (phase === "completed") {
              send("run.completed", {
                run_id: runId,
                status: "completed",
                duration_seconds: job.returnvalue?.duration_seconds ?? undefined,
                decision: (job.returnvalue as unknown as Record<string, unknown> | undefined)?.decision ?? undefined,
              });
            } else if (phase === "failed") {
              send("run.failed", {
                run_id: runId,
                status: "failed",
                error: job.failedReason ?? undefined,
              });
            } else {
              // running, analyzing, etc.
              send("run.updated", {
                run_id: runId,
                phase,
                progress_pct: progress?.progress_pct ?? 0,
                message: progress?.message ?? "",
              });
            }
          } else if (phase === "running" || phase === "analyzing") {
            // Still send periodic updates even if phase hasn't changed
            send("run.updated", {
              run_id: runId,
              phase,
              progress_pct: progress?.progress_pct ?? 0,
              message: progress?.message ?? "",
            });
          }

          // Close stream on terminal states
          if (state === "completed" || state === "failed") {
            cleanup();
          }
        } catch {
          // Transient error — will retry next poll
        }
      };

      const interval = setInterval(pollStatus, 1500);
      pollStatus();

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        if (aggregateInterval) clearInterval(aggregateInterval);
        flushMetrics();
        metricUnsub?.().catch(() => {});
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ── Auth helper (supports header + query param for SSE) ─────────────────

async function authenticateSSE(request: Request): Promise<{ ok: true } | { ok: false; message: string }> {
  const { findApiKeyByHash, touchApiKeyLastUsed } = await import("@loadtoad/db");

  // Try Authorization header first
  let token: string | null = null;
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  }

  // Fall back to query param for EventSource clients that can't set headers
  if (!token) {
    const url = new URL(request.url);
    token = url.searchParams.get("api_key");
  }

  if (!token || !token.startsWith("rm_live_")) {
    return { ok: false, message: "Missing or invalid API key" };
  }

  const keyHash = createHash("sha256").update(token).digest("hex");
  const row = await findApiKeyByHash(keyHash);
  if (!row) {
    return { ok: false, message: "Invalid, expired, or revoked API key" };
  }

  touchApiKeyLastUsed(row.id);
  return { ok: true };
}

// ── Metric aggregation (reused from internal route) ─────────────────────

function aggregateLiveMetrics(metrics: LiveMetric[]): LiveMetric {
  if (metrics.length === 1) return metrics[0];

  const timestamp = Math.max(...metrics.map((m) => m.timestamp));
  const rps = metrics.reduce((sum, m) => sum + m.rps, 0);
  const vus = metrics.reduce((sum, m) => sum + m.vus, 0);
  const timeout_count = metrics.reduce((sum, m) => sum + (m.timeout_count ?? 0), 0);
  const bytes_received = metrics.reduce((sum, m) => sum + (m.bytes_received ?? 0), 0);
  const bytes_sent = metrics.reduce((sum, m) => sum + (m.bytes_sent ?? 0), 0);

  const totalRps = rps || 1;
  const latency_p50 = metrics.reduce((sum, m) => sum + m.latency_p50 * (m.rps / totalRps), 0);
  const latency_p95 = metrics.reduce((sum, m) => sum + m.latency_p95 * (m.rps / totalRps), 0);
  const latency_p99 = metrics.reduce((sum, m) => sum + m.latency_p99 * (m.rps / totalRps), 0);
  const error_rate = metrics.reduce((sum, m) => sum + m.error_rate * (m.rps / totalRps), 0);

  return {
    timestamp: Math.round(timestamp),
    rps: Math.round(rps * 10) / 10,
    latency_p50: Math.round(latency_p50 * 10) / 10,
    latency_p95: Math.round(latency_p95 * 10) / 10,
    latency_p99: Math.round(latency_p99 * 10) / 10,
    error_rate: Math.round(error_rate * 100) / 100,
    vus: Math.round(vus),
    timeout_count,
    bytes_received,
    bytes_sent,
  };
}
