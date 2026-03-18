const statusStyles: Record<string, string> = {
  draft: 'badge-neutral',
  pending: 'badge-info',
  active: 'badge-success',
  degraded: 'badge-warning',
  dissolved: 'badge-error',
  archived: 'badge-neutral',
  submitted: 'badge-info',
  approved_pending_acceptance: 'badge-success',
  rejected: 'badge-error',
  withdrawn: 'badge-neutral',
  left: 'badge-neutral',
  expelled: 'badge-error',
  offline: 'badge-neutral',
  pending_reack: 'badge-warning',
};

export function StatusBadge({ status }: { status: string }) {
  const badgeClass = statusStyles[status] ?? 'badge-neutral';
  return (
    <span className={`badge ${badgeClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
