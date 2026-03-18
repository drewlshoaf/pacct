import { StatusBadge } from './StatusBadge';

interface NetworkCardProps {
  id: string;
  alias: string;
  status: string;
  creator_node_id: string;
  created_at: number;
  memberCount?: number;
}

export function NetworkCard({ id, alias, status, creator_node_id, created_at, memberCount }: NetworkCardProps) {
  return (
    <a
      href={`/networks/${id}`}
      className="card block transition-all duration-200 hover:shadow-lg hover:border-coral-300 dark:hover:border-coral-700 no-underline group"
    >
      {/* Gradient accent bar */}
      <div className="h-1 -mx-6 -mt-6 mb-4 rounded-t-xl" style={{ background: 'linear-gradient(90deg, #D4553A, #E88C30)' }} />

      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold group-hover:text-coral-600 dark:group-hover:text-coral-400 transition-colors" style={{ color: 'var(--pacct-text)' }}>
          {alias}
        </h3>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-1.5 text-sm" style={{ color: 'var(--pacct-text-secondary)' }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--pacct-text-muted)' }}>ID:</span>
          <code className="text-xs font-mono truncate max-w-[180px]" style={{ color: 'var(--pacct-text-secondary)' }}>{id}</code>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--pacct-text-muted)' }}>Creator:</span>
          <code className="text-xs font-mono truncate max-w-[180px]" style={{ color: 'var(--pacct-text-secondary)' }}>{creator_node_id}</code>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--pacct-text-muted)' }}>Created:</span>
          <span>{new Date(created_at).toLocaleDateString()}</span>
        </div>
      </div>

      {memberCount !== undefined && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--pacct-border)' }}>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ background: 'var(--pacct-signal-muted)', color: 'var(--pacct-signal)' }}>
              {memberCount}
            </span>
            <span className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>
              member{memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </a>
  );
}
