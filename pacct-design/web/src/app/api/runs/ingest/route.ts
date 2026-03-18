import { NextResponse } from "next/server";
import type { RunArtifact } from "@loadtoad/artifacts";

export const dynamic = "force-dynamic";

/** POST /api/runs/ingest — ingest a RunArtifact into the database */
export async function POST(request: Request) {
  try {
    const artifact = (await request.json()) as RunArtifact;
    const { ingestRunArtifact } = await import("@loadtoad/db");
    await ingestRunArtifact(artifact);
    return NextResponse.json({ ok: true, id: artifact.id }, { status: 201 });
  } catch (err) {
    console.error("Failed to ingest run:", err);
    return NextResponse.json(
      { error: "Failed to ingest run artifact" },
      { status: 500 },
    );
  }
}
