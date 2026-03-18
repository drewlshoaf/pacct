import { NextResponse } from "next/server";
import type { Queue, Job } from "bullmq";

export const dynamic = "force-dynamic";

// ── Helpers ────────────────────────────────────────────────────────────────

type QueueName = "run-execute" | "run-segment" | "plan-execute";
type JobState = "waiting" | "active" | "completed" | "failed";

const VALID_QUEUES: QueueName[] = ["run-execute", "run-segment", "plan-execute"];
const VALID_STATES: JobState[] = ["waiting", "active", "completed", "failed"];

async function resolveQueue(name: QueueName): Promise<Queue> {
  const { getRunQueue, getSegmentQueue, getPlanQueue } = await import(
    "@loadtoad/queue"
  );
  switch (name) {
    case "run-execute":
      return getRunQueue();
    case "run-segment":
      return getSegmentQueue();
    case "plan-execute":
      return getPlanQueue();
  }
}

function jobToSummary(job: Job, state: string) {
  const data = job.data ?? {};
  const rawProgress = job.progress;
  const progress =
    rawProgress && typeof rawProgress === "object" && "phase" in rawProgress
      ? (rawProgress as Record<string, unknown>)
      : undefined;

  const createdAt = job.timestamp
    ? new Date(job.timestamp).toISOString()
    : undefined;
  const finishedAt = job.finishedOn
    ? new Date(job.finishedOn).toISOString()
    : undefined;
  const durationMs =
    job.finishedOn && job.timestamp ? job.finishedOn - job.timestamp : undefined;

  return {
    id: job.id,
    state,
    run_id: data.run_id ?? null,
    scenario_name: data.scenario?.metadata?.name ?? null,
    phase: progress?.phase ?? null,
    message: progress?.message ?? null,
    error: job.failedReason ?? null,
    created_at: createdAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
  };
}

// ── GET /api/admin/queues — queue statistics ───────────────────────────────

export async function GET() {
  try {
    const { getRunQueue } = await import("@loadtoad/queue");
    const queue = getRunQueue();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return NextResponse.json({
      name: queue.name,
      counts: { waiting, active, completed, failed, delayed },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to get queue stats:", err);
    return NextResponse.json(
      { error: "Failed to get queue statistics" },
      { status: 500 },
    );
  }
}

// ── POST /api/admin/queues — list jobs with filtering ─────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const queueName = body.queue as QueueName;
    const state = body.state as JobState;
    const limit = Math.min(body.limit ?? 20, 100);
    const offset = body.offset ?? 0;

    if (!VALID_QUEUES.includes(queueName)) {
      return NextResponse.json(
        { error: `Invalid queue. Must be one of: ${VALID_QUEUES.join(", ")}` },
        { status: 400 },
      );
    }
    if (!VALID_STATES.includes(state)) {
      return NextResponse.json(
        { error: `Invalid state. Must be one of: ${VALID_STATES.join(", ")}` },
        { status: 400 },
      );
    }

    const queue = await resolveQueue(queueName);
    const jobs = await queue.getJobs([state], offset, offset + limit - 1);

    // Get total count for the state
    let total = 0;
    switch (state) {
      case "waiting":
        total = await queue.getWaitingCount();
        break;
      case "active":
        total = await queue.getActiveCount();
        break;
      case "completed":
        total = await queue.getCompletedCount();
        break;
      case "failed":
        total = await queue.getFailedCount();
        break;
    }

    const summaries = jobs.map((j) => jobToSummary(j, state));

    return NextResponse.json({ jobs: summaries, total, limit, offset });
  } catch (err) {
    console.error("Failed to list queue jobs:", err);
    return NextResponse.json(
      { error: "Failed to list queue jobs" },
      { status: 500 },
    );
  }
}

// ── DELETE /api/admin/queues — remove jobs ─────────────────────────────────
// Supports: single job (job_id), batch (job_ids[]), or flush all (no ids)

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const queueName = body.queue as QueueName;
    const state = body.state as JobState;
    const jobId = body.job_id as string | undefined;
    const jobIds = body.job_ids as string[] | undefined;

    if (!VALID_QUEUES.includes(queueName)) {
      return NextResponse.json(
        { error: `Invalid queue. Must be one of: ${VALID_QUEUES.join(", ")}` },
        { status: 400 },
      );
    }

    if (state === "active") {
      return NextResponse.json(
        { error: "Cannot remove active jobs — wait for them to complete or stop the run first" },
        { status: 400 },
      );
    }

    const queue = await resolveQueue(queueName);

    // Single job removal
    if (jobId) {
      const job = await queue.getJob(jobId);
      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      await job.remove();
      return NextResponse.json({ removed: 1 });
    }

    // Batch removal by IDs
    if (jobIds && jobIds.length > 0) {
      let removed = 0;
      for (const id of jobIds) {
        try {
          const job = await queue.getJob(id);
          if (job) {
            await job.remove();
            removed++;
          }
        } catch {
          // Job may have been removed or moved state
        }
      }
      return NextResponse.json({ removed });
    }

    // Bulk flush by state (all jobs in state)
    let removed = 0;

    if (state === "completed" || state === "failed") {
      // queue.clean(grace, limit, status) — grace=0 means all jobs
      const cleaned = await queue.clean(0, 1000, state);
      removed = cleaned.length;
    } else if (state === "waiting") {
      // Waiting jobs need individual removal
      const jobs = await queue.getJobs(["waiting"], 0, 1000);
      for (const job of jobs) {
        try {
          await job.remove();
          removed++;
        } catch {
          // Job may have moved to active between listing and removal
        }
      }
    }

    return NextResponse.json({ removed });
  } catch (err) {
    console.error("Failed to remove queue jobs:", err);
    return NextResponse.json(
      { error: "Failed to remove queue jobs" },
      { status: 500 },
    );
  }
}

// ── PATCH /api/admin/queues — retry failed jobs ─────────────────────────────
// Supports: single job (job_id) or batch (job_ids[])

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const queueName = body.queue as QueueName;
    const jobId = body.job_id as string | undefined;
    const jobIds = body.job_ids as string[] | undefined;

    if (!VALID_QUEUES.includes(queueName)) {
      return NextResponse.json(
        { error: `Invalid queue. Must be one of: ${VALID_QUEUES.join(", ")}` },
        { status: 400 },
      );
    }

    const queue = await resolveQueue(queueName);
    const idsToRetry = jobIds ?? (jobId ? [jobId] : []);

    if (idsToRetry.length === 0) {
      return NextResponse.json(
        { error: "Provide job_id or job_ids[] to retry" },
        { status: 400 },
      );
    }

    let retried = 0;
    const errors: string[] = [];

    for (const id of idsToRetry) {
      try {
        const job = await queue.getJob(id);
        if (!job) {
          errors.push(`${id}: not found`);
          continue;
        }
        const jobState = await job.getState();
        if (jobState !== "failed") {
          errors.push(`${id}: cannot retry — state is ${jobState}`);
          continue;
        }
        await job.retry("failed");
        retried++;
      } catch (e) {
        errors.push(`${id}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }

    return NextResponse.json({ retried, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("Failed to retry queue jobs:", err);
    return NextResponse.json(
      { error: "Failed to retry queue jobs" },
      { status: 500 },
    );
  }
}
