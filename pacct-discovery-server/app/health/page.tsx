'use client';

import { useState, useEffect } from 'react';
import { HealthIndicator } from '../components/HealthIndicator';

interface HealthData {
  status: string;
  instanceId: string;
  uptime: number;
  version: string;
  dbHealth: {
    connected: boolean;
    latencyMs: number;
  };
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function mapStatus(status: string): 'healthy' | 'degraded' | 'unhealthy' {
  if (status === 'ok') return 'healthy';
  if (status === 'degraded') return 'degraded';
  return 'unhealthy';
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setError(null);
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
    }
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--pacct-text)' }}>
          Service Health
        </h1>
        <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>
          Auto-refreshes every 10 seconds
        </p>
      </div>

      {error && (
        <div className="card mb-6 border-red-300 dark:border-red-700" style={{ background: 'var(--pacct-fail-muted)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--pacct-fail)' }}>
            Error: {error}
          </p>
        </div>
      )}

      {health ? (
        <div className="space-y-6">
          {/* Instance Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>Instance Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Status</span>
                <HealthIndicator status={mapStatus(health.status)} />
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Instance ID</span>
                <code className="text-xs font-mono break-all" style={{ color: 'var(--pacct-text-secondary)' }}>{health.instanceId}</code>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Uptime</span>
                <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>{formatUptime(health.uptime)}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Version</span>
                <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>{health.version}</span>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>Database</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Connection</span>
                <span className={`badge ${health.dbHealth.connected ? 'badge-success' : 'badge-error'}`}>
                  {health.dbHealth.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Latency</span>
                <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>{health.dbHealth.latencyMs}ms</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Last Check</span>
                <span className="text-sm" style={{ color: 'var(--pacct-text-secondary)' }}>{new Date(lastRefresh).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : !error ? (
        <div className="card text-center py-16">
          <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>Loading health data...</p>
        </div>
      ) : null}
    </div>
  );
}
