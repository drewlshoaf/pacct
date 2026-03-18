import { NextResponse } from "next/server";
import type { RunProgress } from "@loadtoad/queue";

export const dynamic = "force-dynamic";

/** GET /api/runs/:id/status — poll job status */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const runId = params.id;
    const { getRunQueue } = await import("@loadtoad/queue");
    const queue = getRunQueue();

    // Search for the job by run_id in job data
    const jobs = await queue.getJobs(
      ["active", "waiting", "delayed", "completed", "failed"],
      0,
      100,
    );

    const job = jobs.find((j) => j.data?.run_id === runId);

    if (!job) {
      return NextResponse.json(
        { error: "Run not found" },
        { status: 404 },
      );
    }

    const state = await job.getState();

    // BullMQ progress defaults to 0 (number) until updateProgress is called with an object
    const rawProgress = job.progress;
    const progress: RunProgress | undefined =
      rawProgress && typeof rawProgress === "object" && "phase" in rawProgress
        ? (rawProgress as RunProgress)
        : undefined;

    // Derive phase from BullMQ state, using progress for detail when active
    let phase: string;
    if (state === "waiting" || state === "delayed") {
      // Job is queued (possibly retrying after a failure)
      phase = "queued";
    } else if (state === "active") {
      // Use progress phase if available, otherwise "starting"
      phase = progress?.phase && progress.phase !== "failed" ? progress.phase : "starting";
    } else if (state === "completed") {
      phase = "completed";
    } else if (state === "failed") {
      phase = "failed";
    } else {
      phase = state;
    }

    return NextResponse.json({
      run_id: runId,
      job_id: job.id,
      state,
      phase,
      progress_pct: progress?.progress_pct ?? 0,
      message: progress?.message ?? "",
      result: state === "completed" ? job.returnvalue : undefined,
      error: state === "failed" ? job.failedReason : undefined,
      attempts: job.attemptsMade,
      created_at: job.timestamp ? new Date(job.timestamp).toISOString() : undefined,
      finished_at: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
    });
  } catch (err) {
    console.error(`Failed to get run status ${params.id}:`, err);
    return NextResponse.json(
      { error: "Failed to get run status" },
      { status: 500 },
    );
  }
}
