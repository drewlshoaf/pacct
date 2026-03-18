'use client';

import { useState, useEffect } from 'react';
import { AvailabilityBadge } from '../components/AvailabilityBadge';
import { RelativeTime } from '../components/RelativeTime';

interface Network {
  id: string;
  alias: string;
  status: string;
}

interface PresenceLease {
  network_id: string;
  node_id: string;
  last_heartbeat_at: number;
  lease_expires_at: number;
  instance_id: string | null;
}

function getAvailability(lease: PresenceLease): 'online' | 'stale' | 'offline' {
  const now = Date.now();
  if (lease.lease_expires_at < now) return 'offline';
  // Stale if lease expires within 10 seconds
  if (lease.lease_expires_at - now < 10_000) return 'stale';
  return 'online';
}

function formatCountdown(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'expired';
  if (diff < 1000) return '<1s';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`;
  return `${Math.floor(diff / 60_000)}m ${Math.floor((diff % 60_000) / 1000)}s`;
}

export default function PresencePage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('');
  const [presence, setPresence] = useState<PresenceLease[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch networks on mount
  useEffect(() => {
    fetch('/api/networks')
      .then((res) => res.json())
      .then((data) => {
        setNetworks(data.networks || []);
        if (data.networks?.length > 0 && !selectedNetworkId) {
          setSelectedNetworkId(data.networks[0].id);
        }
      })
      .catch(() => setError('Failed to load networks'));
  }, []);

  // Fetch presence when network changes
  useEffect(() => {
    if (!selectedNetworkId) return;
    let cancelled = false;

    async function fetchPresence() {
      setLoading(true);
      try {
        const res = await fetch(`/api/networks/${selectedNetworkId}/presence`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setPresence(data.presence || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load presence');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPresence();
    const interval = setInterval(fetchPresence, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedNetworkId]);

  const onlineCount = presence.filter((p) => getAvailability(p) === 'online').length;
  const staleCount = presence.filter((p) => getAvailability(p) === 'stale').length;
  const offlineCount = presence.filter((p) => getAvailability(p) === 'offline').length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--pacct-text)' }}>
          Node Presence
        </h1>
        <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>
          Lease-based presence for all network nodes
        </p>
      </div>

      {/* Network selector */}
      <div className="card mb-6">
        <label className="block text-xs uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--pacct-text-muted)' }}>
          Select Network
        </label>
        <select
          value={selectedNetworkId}
          onChange={(e) => setSelectedNetworkId(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg text-sm font-mono"
          style={{
            background: 'var(--pacct-bg-raised)',
            border: '1px solid var(--pacct-border)',
            color: 'var(--pacct-text)',
          }}
        >
          {networks.length === 0 && <option value="">No networks</option>}
          {networks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.alias} ({n.id})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card mb-6 border-red-300 dark:border-red-700" style={{ background: 'var(--pacct-fail-muted)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--pacct-fail)' }}>Error: {error}</p>
        </div>
      )}

      {/* Summary */}
      {selectedNetworkId && (
        <div className="flex gap-4 mb-6">
          <div className="card flex items-center gap-2 py-3 px-4">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>{onlineCount} online</span>
          </div>
          <div className="card flex items-center gap-2 py-3 px-4">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>{staleCount} stale</span>
          </div>
          <div className="card flex items-center gap-2 py-3 px-4">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>{offlineCount} offline</span>
          </div>
        </div>
      )}

      {/* Node list */}
      {loading && presence.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>Loading presence data...</p>
        </div>
      ) : presence.length === 0 && selectedNetworkId ? (
        <div className="card text-center py-16">
          <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>No presence data for this network</p>
        </div>
      ) : presence.length > 0 ? (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table-ds">
              <thead>
                <tr>
                  <th>Node ID</th>
                  <th>Availability</th>
                  <th>Last Heartbeat</th>
                  <th>Lease Expires</th>
                  <th>Instance ID</th>
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
                      <td>
                        <AvailabilityBadge availability={availability} />
                      </td>
                      <td>
                        <RelativeTime timestamp={p.last_heartbeat_at} />
                      </td>
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
      ) : null}
    </div>
  );
}
