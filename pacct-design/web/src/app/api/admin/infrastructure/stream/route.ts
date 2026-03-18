import type { RunProgress } from "@loadtoad/queue";

export const dynamic = "force-dynamic";

const CONFIG_KEY = "sv:config:injectors";
const CB_CONFIG_KEY = "sv:config:circuit-breaker";
const MODEL_CONFIG_KEY = "sv:config:models";
const TOPO_CONFIG_KEY = "sv:config:topology";

const TOPO_DEFAULTS = {
  degraded_error_pct: 5,
  critical_error_pct: 15,
  error_health_weight: 10,
  latency_baseline_ms: 200,
  latency_health_weight: 0.15,
  health_green_above: 75,
  health_yellow_above: 40,
};

const CB_DEFAULTS = {
  cb_enabled: true,
  cb_error_rate_threshold: 95,
  cb_consecutive_breaches: 3,
  cb_no_response_timeout_s: 30,
  cb_min_requests: 10,
  cb_grace_period_s: 15,
};

/**
 * GET /api/admin/infrastructure/stream — SSE endpoint for live infrastructure status.
 *
 * Streams three event types:
 *   - `queues`: Run + segment queue job counts (every 2s)
 *   - `config`: Current injector config from Redis (on connect + every 10s)
 *   - `workers`: Active run/segment job details (every 2s)
 */
export async function GET(request: Request) {
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

      const { getRunQueue, getSegmentQueue, getRedisConnection } = await import("@loadtoad/queue");

      // ── Poll queue stats ────────────────────────────────────────────
      const pollQueues = async () => {
        if (closed) return;
        try {
          const runQueue = getRunQueue();
          const segQueue = getSegmentQueue();

          const [rWaiting, rActive, rCompleted, rFailed, rDelayed] = await Promise.all([
            runQueue.getWaitingCount(),
            runQueue.getActiveCount(),
            runQueue.getCompletedCount(),
            runQueue.getFailedCount(),
            runQueue.getDelayedCount(),
          ]);

          const [sWaiting, sActive, sCompleted, sFailed] = await Promise.all([
            segQueue.getWaitingCount(),
            segQueue.getActiveCount(),
            segQueue.getCompletedCount(),
            segQueue.getFailedCount(),
          ]);

          send("queues", {
            run: { waiting: rWaiting, active: rActive, completed: rCompleted, failed: rFailed, delayed: rDelayed },
            segment: { waiting: sWaiting, active: sActive, completed: sCompleted, failed: sFailed },
            timestamp: Date.now(),
          });
        } catch {
          // Transient — will retry next tick
        }
      };

      // ── Poll active workers / jobs ──────────────────────────────────
      const pollWorkers = async () => {
        if (closed) return;
        try {
          const runQueue = getRunQueue();
          const segQueue = getSegmentQueue();

          const [activeRuns, activeSegments] = await Promise.all([
            runQueue.getJobs(["active"], 0, 10),
            segQueue.getJobs(["active"], 0, 20),
          ]);

          const runs = await Promise.all(
            activeRuns.map(async (job) => {
              const rawProgress = job.progress;
              const progress: RunProgress | undefined =
                rawProgress && typeof rawProgress === "object" && "phase" in rawProgress
                  ? (rawProgress as RunProgress)
                  : undefined;

              return {
                job_id: job.id,
                run_id: job.data?.run_id,
                scenario_name: job.data?.scenario?.metadata?.name ?? "Load Test",
                phase: progress?.phase ?? "starting",
                progress_pct: progress?.progress_pct ?? 0,
                message: progress?.message ?? "",
                injector_count: progress?.injector_count ?? 1,
                started_at: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
              };
            })
          );

          const segments = activeSegments.map((job) => ({
            job_id: job.id,
            run_id: job.data?.run_id,
            segment_index: job.data?.segment_index,
            segment_count: job.data?.segment_count,
          }));

          send("workers", {
            active_runs: runs,
            active_segments: segments,
            timestamp: Date.now(),
          });
        } catch {
          // Transient
        }
      };

      // ── Poll config ─────────────────────────────────────────────────
      const pollConfig = async () => {
        if (closed) return;
        try {
          const redis = getRedisConnection();
          const raw = await redis.get(CONFIG_KEY);
          const overrides = raw ? JSON.parse(raw) : {};

          const effective = {
            vus_per_injector: overrides.vus_per_injector ?? intEnv("LT_VUS_PER_INJECTOR", 250),
            max_injectors: overrides.max_injectors ?? intEnv("LT_MAX_INJECTORS", 10),
            max_runs: overrides.max_runs ?? intEnv("LT_MAX_RUNS", 2),
            segment_concurrency: overrides.segment_concurrency ?? intEnv("LT_SEGMENT_CONCURRENCY", 2),
            worker_lock_duration_ms: overrides.worker_lock_duration_ms ?? intEnv("LT_WORKER_LOCK_DURATION_MS", 660_000),
            worker_replicas: overrides.worker_replicas ?? intEnv("LT_WORKER_REPLICAS", 3),
            worker_cpu_limit: overrides.worker_cpu_limit ?? (process.env.LT_WORKER_CPU_LIMIT || "2.0"),
            worker_mem_limit: overrides.worker_mem_limit ?? (process.env.LT_WORKER_MEM_LIMIT || "2G"),
          };

          const cbRaw = await redis.get(CB_CONFIG_KEY);
          const cbOverrides = cbRaw ? JSON.parse(cbRaw) : {};
          const cbEffective = {
            cb_enabled: cbOverrides.cb_enabled ?? CB_DEFAULTS.cb_enabled,
            cb_error_rate_threshold: cbOverrides.cb_error_rate_threshold ?? CB_DEFAULTS.cb_error_rate_threshold,
            cb_consecutive_breaches: cbOverrides.cb_consecutive_breaches ?? CB_DEFAULTS.cb_consecutive_breaches,
            cb_no_response_timeout_s: cbOverrides.cb_no_response_timeout_s ?? CB_DEFAULTS.cb_no_response_timeout_s,
            cb_min_requests: cbOverrides.cb_min_requests ?? CB_DEFAULTS.cb_min_requests,
            cb_grace_period_s: cbOverrides.cb_grace_period_s ?? CB_DEFAULTS.cb_grace_period_s,
          };

          // ── Model config ──
          const modelRaw = await redis.get(MODEL_CONFIG_KEY);
          const modelOverrides = modelRaw ? JSON.parse(modelRaw) : {};
          const defaultProvider = inferDefaultProvider();
          const modelEffective = {
            provider: modelOverrides.provider ?? defaultProvider,
            model: modelOverrides.model ?? (process.env.LOADTOAD_MODEL || "claude-sonnet-4-20250514"),
            delay_ms: modelOverrides.delay_ms ?? intEnv("LOADTOAD_DELAY_MS", 0),
          };

          // ── Topology config ──
          const topoRaw = await redis.get(TOPO_CONFIG_KEY);
          const topoOverrides = topoRaw ? JSON.parse(topoRaw) : {};
          const topoEffective = {
            degraded_error_pct: topoOverrides.degraded_error_pct ?? TOPO_DEFAULTS.degraded_error_pct,
            critical_error_pct: topoOverrides.critical_error_pct ?? TOPO_DEFAULTS.critical_error_pct,
            error_health_weight: topoOverrides.error_health_weight ?? TOPO_DEFAULTS.error_health_weight,
            latency_baseline_ms: topoOverrides.latency_baseline_ms ?? TOPO_DEFAULTS.latency_baseline_ms,
            latency_health_weight: topoOverrides.latency_health_weight ?? TOPO_DEFAULTS.latency_health_weight,
            health_green_above: topoOverrides.health_green_above ?? TOPO_DEFAULTS.health_green_above,
            health_yellow_above: topoOverrides.health_yellow_above ?? TOPO_DEFAULTS.health_yellow_above,
          };

          send("config", {
            config: effective,
            cb_config: cbEffective,
            model_config: modelEffective,
            topo_config: topoEffective,
            has_overrides: raw !== null,
            has_cb_overrides: cbRaw !== null,
            has_model_overrides: modelRaw !== null,
            has_topo_overrides: topoRaw !== null,
            timestamp: Date.now(),
          });
        } catch {
          // Transient
        }
      };

      // Initial burst — send all three immediately
      await Promise.all([pollQueues(), pollWorkers(), pollConfig()]);

      // Set up intervals
      const queueInterval = setInterval(pollQueues, 2000);
      const workerInterval = setInterval(pollWorkers, 2000);
      const configInterval = setInterval(pollConfig, 10_000);

      // Heartbeat to detect stale connections
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
        }
      }, 15_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(queueInterval);
        clearInterval(workerInterval);
        clearInterval(configInterval);
        clearInterval(heartbeat);
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
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function intEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

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
