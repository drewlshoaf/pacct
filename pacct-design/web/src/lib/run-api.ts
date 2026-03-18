/** Client-side API helpers for run execution */

export interface StartRunResponse {
  run_id: string;
  status: "queued";
}

export interface RunStatusResponse {
  run_id: string;
  job_id: string;
  state: "waiting" | "active" | "delayed" | "completed" | "failed";
  phase: string;
  progress_pct: number;
  message: string;
  result?: {
    run_id: string;
    status: "completed" | "failed";
    artifact_id?: string;
    duration_seconds: number;
  };
  error?: string;
  created_at?: string;
  finished_at?: string;
}

export async function startRun(scenarioId: string, policyMode?: string): Promise<StartRunResponse> {
  const res = await fetch("/api/runs/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId, policy_mode: policyMode }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to start run (${res.status})`);
  }

  return res.json();
}

export interface StartBulkRunResponse {
  plan_run_id: string;
  status: "queued";
  scenario_count: number;
}

export async function startBulkRun(scenarioIds: string[], policyMode?: string): Promise<StartBulkRunResponse> {
  const res = await fetch("/api/runs/start-bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_ids: scenarioIds, policy_mode: policyMode }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to start bulk run (${res.status})`);
  }

  return res.json();
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  const res = await fetch(`/api/runs/${runId}/status`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to get run status (${res.status})`);
  }

  return res.json();
}
