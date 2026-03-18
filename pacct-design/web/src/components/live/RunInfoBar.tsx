'use client';

import type { TestPhase } from './useStreamingSimulation';
import RunControls from './RunControls';

const phaseConfig: Record<TestPhase, { label: string; color: string; bg: string }> = {
  idle: { label: 'Idle', color: 'var(--rm-text-muted)', bg: 'var(--rm-bg-raised)' },
  'ramp-up': { label: 'Ramp Up', color: 'var(--rm-signal)', bg: 'var(--rm-signal-glow)' },
  steady: { label: 'Steady', color: 'var(--rm-signal)', bg: 'var(--rm-signal-glow)' },
  'ramp-down': { label: 'Ramp Down', color: 'var(--rm-caution)', bg: 'rgba(217,164,65,0.12)' },
  completed: { label: 'Complete', color: 'var(--rm-signal)', bg: 'var(--rm-signal-glow)' },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const pipelineLabels: Record<string, string> = {
  queued: 'Queued',
  starting: 'Starting',
  translating: 'Translating',
  running: 'Running',
  parsing: 'Parsing',
  analyzing: 'Analytics',
  ai_narrative: 'Analysing',
  scoring: 'Scoring',
  ingesting: 'Saving',
  completed: 'Complete',
  failed: 'Failed',
  stopped: 'Stopped',
};

export default function RunInfoBar({ phase, elapsed, totalDuration, isRunning, pipelinePhase, runId, planRunId, planStillRunning, onStop, startedAt, environmentName }: {
  phase: TestPhase;
  elapsed: number;
  totalDuration: number;
  isRunning: boolean;
  pipelinePhase?: string;
  runId?: string;
  planRunId?: string;
  planStillRunning?: boolean;
  onStop?: () => void;
  startedAt?: string | null;
  environmentName?: string | null;
}) {
  const pct = Math.min(100, (elapsed / totalDuration) * 100);
  const p = phaseConfig[phase];
  const pipelineLabel = pipelinePhase ? (pipelineLabels[pipelinePhase] ?? pipelinePhase) : null;

  return (
    <div className="card flex flex-wrap items-center gap-4" style={{ padding: '12px 20px' }}>
      {/* Pipeline phase badge */}
      {pipelineLabel ? (
        <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md" style={{ background: p.bg, color: p.color }}>
          {isRunning && (
            <span
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              style={{ background: p.color, animation: 'live-pulse 1.5s ease-in-out infinite' }}
            />
          )}
          {pipelineLabel}
        </span>
      ) : null}

      {/* Separator */}
      <span style={{ width: 1, height: 20, background: 'var(--rm-border)' }} />

      {/* Started */}
      {startedAt && (
        <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--rm-text-muted)', marginRight: 4 }}>Started</span>
          <span className="font-mono text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>
            {new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
      )}

      {/* Elapsed */}
      <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
        <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--rm-text-muted)', marginRight: 4 }}>Elapsed</span>
        <span className="font-mono text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>
          {formatTime(elapsed)}
          <span style={{ color: 'var(--rm-text-muted)' }}> / {formatTime(totalDuration)}</span>
        </span>
      </span>

      {/* Environment */}
      {environmentName && (
        <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          <span className="font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--rm-text-muted)', marginRight: 4 }}>Env</span>
          <span className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>{environmentName}</span>
        </span>
      )}

      {/* Progress bar */}
      <div className="flex-1 min-w-[100px]">
        <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'var(--rm-border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: 'var(--rm-signal)',
            }}
          />
        </div>
      </div>

      {/* Run controls */}
      {runId && pipelinePhase && (
        <RunControls runId={runId} isRunning={isRunning} phase={pipelinePhase} planRunId={planRunId} planStillRunning={planStillRunning} onStop={onStop} />
      )}

    </div>
  );
}
