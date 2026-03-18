'use client';

import { useState, useRef, useCallback } from 'react';
import { startRun, getRunStatus } from '@/lib/run-api';
import type { RunStatusResponse } from '@/lib/run-api';

export type RunState = 'idle' | 'starting' | 'running' | 'completed' | 'error';

export interface UseRunExecutionReturn {
  state: RunState;
  runId: string | null;
  phase: string | null;
  progressPct: number;
  message: string;
  error: string | null;
  artifactId: string | null;
  start: (scenarioId: string) => void;
  reset: () => void;
}

const POLL_INTERVAL_MS = 2000;

export function useRunExecution(): UseRunExecutionReturn {
  const [state, setState] = useState<RunState>('idle');
  const [runId, setRunId] = useState<string | null>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback((id: string) => {
    const poll = async () => {
      try {
        const status: RunStatusResponse = await getRunStatus(id);
        setPhase(status.phase);
        setProgressPct(status.progress_pct);
        setMessage(status.message);

        if (status.state === 'completed') {
          setState('completed');
          setArtifactId(status.result?.artifact_id ?? id);
          stopPolling();
        } else if (status.state === 'failed') {
          setState('error');
          setError(status.error ?? 'Run failed');
          stopPolling();
        }
      } catch {
        // Network error during poll — don't stop, will retry
      }
    };

    // First poll immediately
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const start = useCallback((scenarioId: string) => {
    stopPolling();
    setState('starting');
    setError(null);
    setArtifactId(null);
    setPhase(null);
    setProgressPct(0);
    setMessage('');

    startRun(scenarioId)
      .then((res) => {
        setRunId(res.run_id);
        setState('running');
        setPhase('queued');
        pollStatus(res.run_id);
      })
      .catch((err) => {
        setState('error');
        setError(err.message || 'Failed to start run');
      });
  }, [pollStatus, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState('idle');
    setRunId(null);
    setPhase(null);
    setProgressPct(0);
    setMessage('');
    setError(null);
    setArtifactId(null);
  }, [stopPolling]);

  return {
    state,
    runId,
    phase,
    progressPct,
    message,
    error,
    artifactId,
    start,
    reset,
  };
}
