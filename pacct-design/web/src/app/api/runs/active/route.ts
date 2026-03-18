import { NextResponse } from "next/server";
import type { RunProgress } from "@loadtoad/queue";

export const dynamic = "force-dynamic";

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

/** GET /api/runs/active — get the most recent active or waiting run */
export async function GET() {
  try {
    const { getRunQueue } = await import("@loadtoad/queue");
    const queue = getRunQueue();

    // Check active jobs first, then waiting
    const activeJobs = await queue.getJobs(["active"], 0, 5);
    const waitingJobs = await queue.getJobs(["waiting", "delayed"], 0, 5);

    const job = activeJobs[0] ?? waitingJobs[0];

    if (!job) {
      return NextResponse.json({ active: false });
    }

    const state = await job.getState();
    const rawProgress = job.progress;
    const progress: RunProgress | undefined =
      rawProgress && typeof rawProgress === "object" && "phase" in rawProgress
        ? (rawProgress as RunProgress)
        : undefined;

    // Use worker-reported total_duration (accurate for all load patterns).
    // Fall back to profile-based estimate before the worker reports it.
    const totalDuration = progress?.total_duration ?? computeFallbackDuration(job.data?.scenario?.load_profile);

    return NextResponse.json({
      active: true,
      run_id: job.data?.run_id,
      job_id: job.id,
      state,
      phase: progress?.phase ?? (state === "active" ? "starting" : "queued"),
      progress_pct: progress?.progress_pct ?? 0,
      message: progress?.message ?? "",
      injector_count: progress?.injector_count ?? 1,
      total_duration: totalDuration,
      scenario_id: job.data?.scenario?.metadata?.id ?? null,
      scenario_name: job.data?.scenario?.metadata?.name ?? "Load Test",
      created_at: job.timestamp ? new Date(job.timestamp).toISOString() : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to check active runs" },
      { status: 500 },
    );
  }
}
