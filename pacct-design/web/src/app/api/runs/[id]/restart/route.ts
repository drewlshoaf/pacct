import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: runId } = await params;

    const { getRunQueue, getRedisConnection } = await import("@loadtoad/queue");
    const queue = getRunQueue();

    // Find the original job by run_id to retrieve scenario data
    const jobs = await queue.getJobs(
      ["active", "waiting", "delayed", "completed", "failed"],
      0, 200,
    );
    const originalJob = jobs.find((j) => j.data?.run_id === runId);

    if (!originalJob) {
      return NextResponse.json(
        { error: "Original run not found" },
        { status: 404 },
      );
    }

    const scenario = originalJob.data.scenario;
    if (!scenario) {
      return NextResponse.json(
        { error: "Cannot restart: scenario data not available" },
        { status: 422 },
      );
    }

    // If the original run is still active, stop it first
    const state = await originalJob.getState();
    if (state === "active") {
      const redis = getRedisConnection();
      await redis.setex(`sv:run:abort:${runId}`, 3600, "Stopped for restart");
    }

    // Enqueue a new run with the same scenario
    const newRunId = randomUUID();
    await queue.add("run:execute", {
      run_id: newRunId,
      scenario,
      triggered_by: "web-ui-restart",
      requested_at: new Date().toISOString(),
      policy_mode: originalJob.data.policy_mode,
    });

    return NextResponse.json(
      { run_id: newRunId, status: "queued", restarted_from: runId },
      { status: 202 },
    );
  } catch (err) {
    console.error("Failed to restart run:", err);
    return NextResponse.json(
      { error: "Failed to restart run" },
      { status: 500 },
    );
  }
}
