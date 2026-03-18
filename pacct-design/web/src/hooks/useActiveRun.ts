'use client';

import { useState, useEffect } from 'react';

interface ActiveRunState {
  checking: boolean;
  active: boolean;
  runId: string | null;
  scenarioId: string | null;
  scenarioName: string | null;
}

/**
 * Polls /api/runs/active to determine if a run is currently in progress.
 * Returns { checking, active, runId, scenarioName }.
 *
 * Polls every `intervalMs` (default 5s) while mounted.
 */
export function useActiveRun(intervalMs = 5000): ActiveRunState {
  const [state, setState] = useState<ActiveRunState>({
    checking: true,
    active: false,
    runId: null,
    scenarioId: null,
    scenarioName: null,
  });

  useEffect(() => {
    let mounted = true;

    const check = () => {
      fetch('/api/runs/active')
        .then(r => r.json())
        .then(data => {
          if (!mounted) return;
          setState({
            checking: false,
            active: !!data.active,
            runId: data.run_id ?? null,
            scenarioId: data.scenario_id ?? null,
            scenarioName: data.scenario_name ?? null,
          });
        })
        .catch(() => {
          if (!mounted) return;
          setState(prev => ({ ...prev, checking: false }));
        });
    };

    check();
    const timer = setInterval(check, intervalMs);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return state;
}
