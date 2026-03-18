'use client';

const dotColor: Record<string, string> = {
  completed: 'var(--rm-pass)',
  failed: 'var(--rm-fail)',
  running: 'var(--rm-signal)',
};

export default function MiniStrip({ statuses }: { statuses: (string | null)[] }) {
  const last3 = statuses.slice(0, 3);
  return (
    <div className="flex items-center gap-1">
      {last3.map((s, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: s ? (dotColor[s] ?? 'var(--rm-text-muted)') : 'var(--rm-border)' }}
          title={s ?? 'unknown'}
        />
      ))}
    </div>
  );
}
