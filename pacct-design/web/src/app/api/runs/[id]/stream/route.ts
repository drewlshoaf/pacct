import type { RunProgress, LiveMetric } from "@loadtoad/queue";

export const dynamic = "force-dynamic";

/**
 * GET /api/runs/:id/stream — SSE endpoint for live run monitoring.
 *
 * Sends two types of events:
 *   - `status`: Run phase/progress updates (polled from BullMQ every 1s)
 *   - `metric`: Live metric snapshots (from Redis pub/sub, ~every 2s)
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const runId = params.id;

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
      // When multiple injectors are running, metrics arrive from each segment.
      // We buffer them in a 2-second window and emit one aggregated snapshot.
      const { getRunQueue, subscribeLiveMetrics } = await import("@loadtoad/queue");
      let metricUnsub: (() => Promise<void>) | null = null;
      let metricBuffer: LiveMetric[] = [];
      let aggregateInterval: ReturnType<typeof setInterval> | null = null;

      const flushMetrics = () => {
        if (metricBuffer.length === 0) return;
        const aggregated = aggregateLiveMetrics(metricBuffer);
        send("metric", aggregated);
        metricBuffer = [];
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

        // Flush buffered metrics every 2 seconds
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
          // Fast path: use cached job ID for O(1) lookup instead of scanning all jobs
          let job = cachedJobId ? await queue.getJob(cachedJobId) : null;

          // Slow path (first poll only): scan jobs to find the matching run_id
          if (!job || job.data?.run_id !== runId) {
            const jobs = await queue.getJobs(
              ["active", "waiting", "delayed", "completed", "failed"],
              0,
              100,
            );
            job = jobs.find((j) => j.data?.run_id === runId) ?? null;
            if (job?.id) cachedJobId = job.id;
          }

          if (!job) {
            send("status", { phase: "not_found", state: "unknown", progress_pct: 0, message: "" });
            return;
          }

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

          // Use the worker-reported total_duration (set after scenario translation,
          // accurate for all load patterns including step/custom). Fall back to
          // a simple profile-based estimate before the worker reports it.
          const totalDuration = progress?.total_duration ?? computeFallbackDuration(job.data?.scenario?.load_profile);

          // Extract lightweight step summaries from the scenario
          const scenario = job.data?.scenario;
          const stepsSummary = scenario?.steps?.map((s: { name: string; config: { step_type: string; rest?: { method: string; path: string }; graphql?: { endpoint: string; operation_type: string }; browser?: { url: string } } }) => ({
            name: s.name,
            step_type: s.config.step_type,
            method: s.config.rest?.method ?? undefined,
            path: s.config.rest?.path ?? s.config.graphql?.endpoint ?? s.config.browser?.url ?? undefined,
            operation_type: s.config.graphql?.operation_type ?? undefined,
          })) ?? [];

          // Extract load profile summary
          const lp = scenario?.load_profile;
          const loadProfileSummary = lp ? {
            virtual_users: lp.virtual_users,
            pattern_type: lp.pattern?.type,
            duration_seconds: lp.duration?.fixed?.seconds ?? lp.duration?.iterations?.max_duration_seconds ?? undefined,
            ramp_up_seconds: lp.ramp_up?.duration_seconds,
          } : undefined;

          const statusData = {
            run_id: runId,
            job_id: job.id,
            state,
            phase,
            progress_pct: progress?.progress_pct ?? 0,
            message: progress?.message ?? "",
            injector_count: progress?.injector_count ?? 1,
            total_duration: totalDuration,
            scenario_name: job.data?.scenario?.metadata?.name ?? undefined,
            scenario_description: scenario?.metadata?.description ?? undefined,
            base_url: scenario?.metadata?.base_url ?? undefined,
            steps: stepsSummary,
            load_profile: loadProfileSummary,
            result: state === "completed" ? job.returnvalue : undefined,
            error: state === "failed" ? job.failedReason : undefined,
            attempts: job.attemptsMade,
            created_at: job.timestamp
              ? new Date(job.timestamp).toISOString()
              : undefined,
            finished_at: job.finishedOn
              ? new Date(job.finishedOn).toISOString()
              : undefined,
          };

          // Always send on state change, or at least every poll
          if (phase !== lastPhase) {
            lastPhase = phase;
          }
          send("status", statusData);

          // Close stream on terminal states
          if (state === "completed" || state === "failed") {
            cleanup();
          }
        } catch {
          // Transient error — will retry next poll
        }
      };

      const interval = setInterval(pollStatus, 1500);
      // Initial poll immediately
      pollStatus();

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        if (aggregateInterval) clearInterval(aggregateInterval);
        flushMetrics(); // emit any remaining buffered metrics
        metricUnsub?.().catch(() => {});
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // Handle client disconnect
      _request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Compute a fallback duration from the load profile before the worker reports one. */
function computeFallbackDuration(profile?: { duration?: { type?: string; fixed?: { seconds: number }; iterations?: { max_duration_seconds: number } }; ramp_up?: { duration_seconds: number }; ramp_down?: { duration_seconds: number }; pattern?: { type?: string; step?: { step_count: number; step_duration_seconds: number }; custom?: { stages: { duration_seconds: number }[] } } }): number {
  if (!profile) return 60;
  const dur = profile.duration;
  let testSec: number;
  if (dur?.type === "fixed" && dur.fixed) {
    testSec = dur.fixed.seconds;
  } else if (dur?.type === "iterations" && dur.iterations) {
    testSec = dur.iterations.max_duration_seconds;
  } else if (profile.pattern?.type === "step" && profile.pattern.step) {
    testSec = profile.pattern.step.step_count * profile.pattern.step.step_duration_seconds;
  } else if (profile.pattern?.type === "custom" && profile.pattern.custom?.stages) {
    testSec = profile.pattern.custom.stages.reduce((sum: number, s: { duration_seconds: number }) => sum + s.duration_seconds, 0);
  } else {
    testSec = 60;
  }
  const rampUp = profile.ramp_up?.duration_seconds ?? 0;
  const rampDown = profile.ramp_down?.duration_seconds ?? 0;
  return rampUp + testSec + rampDown;
}

/**
 * Aggregate multiple LiveMetric snapshots from parallel injectors into one.
 * RPS and VUs are summed; latencies and error_rate are weighted by RPS.
 */
function aggregateLiveMetrics(metrics: LiveMetric[]): LiveMetric {
  const n = metrics.length;
  if (n === 1) return metrics[0];

  const timestamp = Math.max(...metrics.map(m => m.timestamp));
  const rps = metrics.reduce((sum, m) => sum + m.rps, 0);
  const vus = metrics.reduce((sum, m) => sum + m.vus, 0);
  const timeout_count = metrics.reduce((sum, m) => sum + (m.timeout_count ?? 0), 0);
  const bytes_received = metrics.reduce((sum, m) => sum + (m.bytes_received ?? 0), 0);
  const bytes_sent = metrics.reduce((sum, m) => sum + (m.bytes_sent ?? 0), 0);

  // Weighted average by RPS (injectors with more throughput contribute more)
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
