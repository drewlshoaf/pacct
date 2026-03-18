type Availability = 'online' | 'stale' | 'offline' | 'unknown';

const styles: Record<Availability, string> = {
  online: 'badge-success',
  stale: 'badge-warning',
  offline: 'badge-error',
  unknown: 'badge-neutral',
};

const labels: Record<Availability, string> = {
  online: 'Online',
  stale: 'Stale',
  offline: 'Offline',
  unknown: 'Unknown',
};

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  const badgeClass = styles[availability] ?? 'badge-neutral';
  return (
    <span className={`badge ${badgeClass}`}>
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          availability === 'online'
            ? 'bg-green-500'
            : availability === 'stale'
              ? 'bg-yellow-500'
              : availability === 'offline'
                ? 'bg-red-500'
                : 'bg-stone-400'
        }`}
      />
      {labels[availability] ?? 'Unknown'}
    </span>
  );
}
