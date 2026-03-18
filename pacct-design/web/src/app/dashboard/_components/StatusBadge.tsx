'use client';

type BadgeStatus = 'completed' | 'failed' | 'running' | 'queued' | 'RUNNING';

const config: Record<string, { bg: string; color: string; dot: string }> = {
  completed: { bg: 'rgba(46,139,62,0.12)', color: 'var(--rm-pass)', dot: 'var(--rm-pass)' },
  failed: { bg: 'rgba(220,53,69,0.12)', color: 'var(--rm-fail)', dot: 'var(--rm-fail)' },
  running: { bg: 'rgba(232,185,49,0.12)', color: 'var(--rm-signal)', dot: 'var(--rm-signal)' },
  RUNNING: { bg: 'rgba(232,185,49,0.12)', color: 'var(--rm-signal)', dot: 'var(--rm-signal)' },
  queued: { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)', dot: 'var(--rm-text-muted)' },
};

const defaultConfig = { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)', dot: 'var(--rm-text-muted)' };

export default function StatusBadge({ status }: { status: BadgeStatus | string }) {
  const c = config[status] ?? defaultConfig;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold font-mono px-2 py-0.5 rounded-md"
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full${status === 'running' || status === 'RUNNING' ? ' animate-pulse' : ''}`}
        style={{ background: c.dot }}
      />
      {status}
    </span>
  );
}
