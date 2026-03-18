'use client';

import { useState } from 'react';

interface RunControlsProps {
  runId: string;
  isRunning: boolean;
  phase: string;
  planRunId?: string;
  planStillRunning?: boolean;
  onStop?: () => void;
}

type ControlAction = 'idle' | 'stopping' | 'stopped' | 'restarting';

const ACTIVE_PHASES = ['queued', 'starting', 'translating', 'distributing', 'running'];
const TERMINAL_PHASES = ['completed', 'failed', 'stopped', 'circuit_breaker'];

export default function RunControls({ runId, isRunning, phase, planRunId, planStillRunning, onStop }: RunControlsProps) {
  const [action, setAction] = useState<ControlAction>('idle');

  const canStopScenario = isRunning && action === 'idle' && ACTIVE_PHASES.includes(phase);
  const canStopPlan = !!planStillRunning && action === 'idle';
  const canStop = canStopScenario || canStopPlan;
  const canRestart = !planStillRunning && (TERMINAL_PHASES.includes(phase) || action === 'stopped');

  const handleStop = async () => {
    setAction('stopping');
    try {
      // If the current scenario is active, stop it; otherwise cancel the plan
      const stopUrl = canStopScenario
        ? `/api/runs/${runId}/stop`
        : `/api/plan-runs/${planRunId}/cancel`;
      const res = await fetch(stopUrl, { method: 'POST' });
      if (res.ok) {
        setAction('stopped');
        onStop?.();
      } else {
        setAction('idle');
      }
    } catch {
      setAction('idle');
    }
  };

  const handleRestart = async () => {
    setAction('restarting');
    try {
      const res = await fetch(`/api/runs/${runId}/restart`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        // Navigate to live page with the new run_id
        window.location.href = `/dashboard/live?run_id=${data.run_id}`;
      } else {
        setAction('idle');
      }
    } catch {
      setAction('idle');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={!canStop}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all"
        style={{
          background: canStop ? 'rgba(211,93,93,0.12)' : 'var(--rm-bg-raised)',
          color: canStop ? 'var(--rm-fail)' : 'var(--rm-text-muted)',
          cursor: canStop ? 'pointer' : 'not-allowed',
          opacity: canStop ? 1 : 0.5,
        }}
        title="Stop the running test"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="2" y="2" width="8" height="8" rx="1" />
        </svg>
        {action === 'stopping' ? 'Stopping...' : canStopScenario ? 'Stop' : 'Stop Plan'}
      </button>

      {/* Restart button */}
      <button
        onClick={handleRestart}
        disabled={!canRestart}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all"
        style={{
          background: canRestart ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
          color: canRestart ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
          cursor: canRestart ? 'pointer' : 'not-allowed',
          opacity: canRestart ? 1 : 0.5,
        }}
        title="Restart the test with the same scenario"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 4v6h6" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        {action === 'restarting' ? 'Restarting...' : 'Restart'}
      </button>
    </div>
  );
}
