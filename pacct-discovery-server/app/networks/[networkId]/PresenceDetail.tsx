'use client';

import { AvailabilityBadge } from '@/app/components/AvailabilityBadge';
import { RelativeTime } from '@/app/components/RelativeTime';

interface PresenceEntry {
  node_id: string;
  last_heartbeat_at: number;
  lease_expires_at: number;
  instance_id: string | null;
}

function getAvailability(p: PresenceEntry): 'online' | 'stale' | 'offline' {
  const now = Date.now();
  if (p.lease_expires_at < now) return 'offline';
  if (p.lease_expires_at - now < 10_000) return 'stale';
  return 'online';
}

function formatCountdown(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'expired';
  if (diff < 1000) return '<1s';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  return `${Math.floor(diff / 60_000)}m ${Math.floor((diff % 60_000) / 1000)}s`;
}

export function PresenceDetail({ presence }: { presence: PresenceEntry[] }) {
  if (presence.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>Presence Leases</h3>
        <p className="text-sm italic" style={{ color: 'var(--pacct-text-muted)' }}>No presence data</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>
        Presence Leases
        <span className="ml-2 text-sm font-normal" style={{ color: 'var(--pacct-text-muted)' }}>({presence.length})</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="table-ds">
          <thead>
            <tr>
              <th>Node ID</th>
              <th>Availability</th>
              <th>Last Heartbeat</th>
              <th>Lease Expires</th>
              <th>Instance</th>
            </tr>
          </thead>
          <tbody>
            {presence.map((p, i) => {
              const availability = getAvailability(p);
              return (
                <tr key={p.node_id} className={i % 2 === 1 ? 'bg-[var(--pacct-bg-raised)]/30' : ''}>
                  <td>
                    <code className="text-xs font-mono" style={{ color: 'var(--pacct-text-secondary)' }}>{p.node_id}</code>
                  </td>
                  <td><AvailabilityBadge availability={availability} /></td>
                  <td><RelativeTime timestamp={p.last_heartbeat_at} /></td>
                  <td>
                    <span className="text-sm" style={{ color: availability === 'offline' ? 'var(--pacct-fail)' : 'var(--pacct-text-secondary)' }}>
                      {formatCountdown(p.lease_expires_at)}
                    </span>
                  </td>
                  <td>
                    {p.instance_id ? (
                      <code className="text-xs font-mono truncate max-w-[120px] inline-block" style={{ color: 'var(--pacct-text-muted)' }}>
                        {p.instance_id}
                      </code>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--pacct-text-muted)' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
