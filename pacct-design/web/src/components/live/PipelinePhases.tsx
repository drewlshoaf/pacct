'use client';

import Link from 'next/link';

const PHASES = [
  { key: 'queued', label: 'Queued' },
  { key: 'starting', label: 'Starting' },
  { key: 'translating', label: 'Translating' },
  { key: 'running', label: 'Running' },
  { key: 'parsing', label: 'Parsing' },
  { key: 'analyzing', label: 'Analytics' },
  { key: 'ai_narrative', label: 'Analysing' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'ingesting', label: 'Saving' },
] as const;

function getPhaseIndex(phase: string): number {
  return PHASES.findIndex(p => p.key === phase);
}

interface PipelinePhasesProps {
  phase: string;
  state: string;
  progressPct: number;
  error?: string;
  artifactId?: string;
}

export default function PipelinePhases({ phase, state, progressPct, error, artifactId }: PipelinePhasesProps) {
  const currentIndex = getPhaseIndex(phase);
  const isCompleted = state === 'completed';
  const isFailed = state === 'failed';

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>Pipeline</h3>
        <span className="text-[11px] font-mono" style={{ color: 'var(--rm-text-muted)' }}>{progressPct}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full overflow-hidden mb-3" style={{ height: 4, background: 'var(--rm-bg-raised)' }}>
        {isFailed ? (
          <div className="h-full rounded-full" style={{ width: '100%', background: 'var(--rm-fail)' }} />
        ) : isCompleted ? (
          <div className="h-full rounded-full" style={{ width: '100%', background: 'var(--rm-signal)' }} />
        ) : progressPct > 0 ? (
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--rm-signal)' }} />
        ) : (
          <div className="h-full rounded-full" style={{ width: '15%', background: 'var(--rm-signal)', opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}
      </div>

      {/* Compact phase list */}
      <div className="space-y-0.5">
        {PHASES.map((p, i) => {
          let pState: 'done' | 'active' | 'pending' | 'failed' = 'pending';
          if (isFailed && p.key === phase) {
            pState = 'failed';
          } else if (isCompleted || i < currentIndex) {
            pState = 'done';
          } else if (i === currentIndex) {
            pState = 'active';
          }

          return (
            <div
              key={p.key}
              className="flex items-center gap-2 px-2 py-1 rounded transition-all"
              style={{
                background: pState === 'active' ? 'var(--rm-signal-glow)' : pState === 'failed' ? 'rgba(211,93,93,0.08)' : 'transparent',
              }}
            >
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{
                background: pState === 'done' ? 'var(--rm-signal)' : pState === 'failed' ? 'var(--rm-fail)' : 'var(--rm-bg-raised)',
                border: pState === 'active' ? '1.5px solid var(--rm-signal)' : 'none',
              }}>
                {pState === 'done' ? (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : pState === 'active' ? (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="4" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" /></svg>
                ) : pState === 'failed' ? (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--rm-text-muted)', opacity: 0.3 }} />
                )}
              </div>
              <span className="text-[11px]" style={{
                color: pState === 'done' ? 'var(--rm-text-muted)' : pState === 'active' ? 'var(--rm-text)' : pState === 'failed' ? 'var(--rm-fail)' : '#4A5060',
                fontWeight: pState === 'active' ? 600 : 400,
              }}>
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Terminal states */}
      {isCompleted && (
        <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--rm-border)' }}>
          {artifactId ? (
            <Link
              href={`/dashboard/analytics?plan_id=${artifactId}`}
              className="text-[11px] font-medium px-2.5 py-1 rounded no-underline transition-opacity hover:opacity-80 flex items-center gap-1.5"
              style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Complete — View Results
            </Link>
          ) : (
            <span className="text-[11px] font-medium" style={{ color: 'var(--rm-signal)' }}>Complete</span>
          )}
        </div>
      )}

      {isFailed && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--rm-border)' }}>
          <span className="text-[11px] font-medium" style={{ color: 'var(--rm-fail)' }}>Failed</span>
          {error && <p className="text-[10px] mt-0.5" style={{ color: 'var(--rm-text-secondary)' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
