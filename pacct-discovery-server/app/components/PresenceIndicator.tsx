export function PresenceIndicator({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          online
            ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
            : 'bg-stone-300 dark:bg-stone-600'
        }`}
      />
      <span className="text-xs" style={{ color: 'var(--pacct-text-muted)' }}>
        {online ? 'Online' : 'Offline'}
      </span>
    </span>
  );
}
