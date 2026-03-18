interface Event {
  id: number;
  event_type: string;
  node_id: string | null;
  payload: Record<string, unknown> | string | null;
  timestamp: number;
}

const eventTypeStyles: Record<string, string> = {
  network_created: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  member_joined: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  member_left: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  applicant_submitted: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  vote_cast: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  network_activated: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  network_dissolved: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  manifest_updated: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  presence_update: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
};

export function EventLog({ events }: { events: Event[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>
        Recent Events
      </h3>
      {events.length === 0 ? (
        <p className="text-sm italic" style={{ color: 'var(--pacct-text-muted)' }}>No events</p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const typeClass = eventTypeStyles[e.event_type] ?? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400';
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 py-2.5"
                style={{ borderBottom: '1px solid var(--pacct-border)' }}
              >
                <div className="flex-shrink-0 pt-0.5">
                  <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--pacct-signal)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeClass}`}>
                      {e.event_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--pacct-text-muted)' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {e.node_id && (
                      <code className="text-xs font-mono truncate" style={{ color: 'var(--pacct-text-secondary)' }}>
                        {e.node_id}
                      </code>
                    )}
                    {e.payload && (
                      <span className="text-xs truncate" style={{ color: 'var(--pacct-text-muted)' }}>
                        {typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
