import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: runId } = await params;

    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    await redis.setex(`sv:run:abort:${runId}`, 3600, "Stopped by user");

    return NextResponse.json({ message: "Stop requested", run_id: runId });
  } catch (err) {
    console.error("Failed to stop run:", err);
    return NextResponse.json({ error: "Failed to stop run" }, { status: 500 });
  }
}
