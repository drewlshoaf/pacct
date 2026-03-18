import { NextResponse } from "next/server";
import path from "node:path";
import { artifactToRunDetail } from "@/lib/adapter";
import type { ScenarioEnrichment } from "@/lib/adapter";
import type { RunArtifact } from "@loadtoad/artifacts";

export const dynamic = "force-dynamic";

// Resolve runs/ relative to monorepo root (two levels up from packages/web)
const RUNS_DIR = process.env.RM_RUNS_DIR || process.env.LOADTOAD_RUNS_DIR || path.resolve(process.cwd(), "../../runs");
const USE_DB = !!process.env.DATABASE_URL;

/** Look up the scenario definition by name to enrich run metadata */
async function lookupEnrichment(artifact: RunArtifact, scenarioIndex: number): Promise<ScenarioEnrichment | undefined> {
  if (!USE_DB) return undefined;
  const scenarioName = artifact.scenarios[scenarioIndex]?.name;
  if (!scenarioName) return undefined;

  try {
    const { listScenarios, listEnvironments } = await import("@loadtoad/db");
    const scenarios = await listScenarios({ limit: 200 });
    const match = scenarios.find(s => s.metadata.name === scenarioName);
    if (!match) return undefined;

    const primaryStep = match.steps[0];
    const stepType = primaryStep?.config.step_type;
    const loadPattern = match.load_profile?.pattern?.type;
    const baseUrl = match.metadata.base_url || undefined;

    // Try to match base_url to a known environment for a friendly name
    let environmentName: string | undefined;
    if (baseUrl) {
      try {
        const environments = await listEnvironments({ limit: 50 });
        const envMatch = environments.find(e => e.base_url === baseUrl);
        if (envMatch) environmentName = envMatch.name;
      } catch { /* ignore */ }
    }

    return { stepType, loadPattern, baseUrl, environmentName };
  } catch {
    return undefined;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    if (!USE_DB) {
      return NextResponse.json({ error: "Delete requires database" }, { status: 501 });
    }

    const { deleteRun } = await import("@loadtoad/db");
    const deleted = await deleteRun(params.id);
    if (!deleted) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`Failed to delete run ${params.id}:`, err);
    return NextResponse.json({ error: "Failed to delete run" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const scenarioParam = new URL(_request.url).searchParams.get("scenario");
    const scenarioIndex = scenarioParam != null ? parseInt(scenarioParam, 10) : undefined;

    if (USE_DB) {
      const { getRunArtifact } = await import("@loadtoad/db");
      const artifact = await getRunArtifact(params.id);
      if (!artifact) {
        return NextResponse.json({ error: "Run not found" }, { status: 404 });
      }
      const idx = scenarioIndex ?? 0;
      const enrichment = await lookupEnrichment(artifact, idx);
      const detail = artifactToRunDetail(artifact, scenarioIndex, enrichment);
      return NextResponse.json(detail);
    }

    // Filesystem fallback
    const { readArtifact } = await import("@loadtoad/artifacts");
    const artifact = await readArtifact(params.id, RUNS_DIR);
    const detail = artifactToRunDetail(artifact, scenarioIndex);
    return NextResponse.json(detail);
  } catch (err) {
    console.error(`Failed to read run ${params.id}:`, err);
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
}
