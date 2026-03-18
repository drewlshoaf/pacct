import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Set cancellation flag in Redis
    const { getRedisConnection } = await import("@loadtoad/queue");
    const redis = getRedisConnection();
    await redis.set(`sv:plan-run:cancelled:${id}`, "1", "EX", 3600);

    return NextResponse.json({ message: "Cancellation requested", plan_run_id: id });
  } catch (err) {
    console.error("Failed to cancel plan run:", err);
    return NextResponse.json({ error: "Failed to cancel plan run" }, { status: 500 });
  }
}
