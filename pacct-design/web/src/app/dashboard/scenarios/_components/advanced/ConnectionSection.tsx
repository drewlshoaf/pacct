'use client';

import type { ConnectionConfig } from '../../types';
import SectionCard from '../SectionCard';

interface ConnectionSectionProps {
  config: ConnectionConfig;
  onChange: (config: ConnectionConfig) => void;
}

export default function ConnectionSection({ config, onChange }: ConnectionSectionProps) {
  return (
    <SectionCard title="Connection Pooling">
      <div className="space-y-4">
        {/* Pool Size */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
            Pool Size
          </label>
          <input
            type="number"
            min={1}
            value={config.pool_size}
            onChange={(e) =>
              onChange({ ...config, pool_size: Math.max(1, parseInt(e.target.value) || 1) })
            }
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            Maximum number of concurrent connections in the pool.
          </p>
        </div>

        {/* Max Idle Connections */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
            Max Idle Connections
          </label>
          <input
            type="number"
            min={0}
            value={config.max_idle}
            onChange={(e) =>
              onChange({ ...config, max_idle: Math.max(0, parseInt(e.target.value) || 0) })
            }
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            Connections kept alive while idle. Set to 0 to close immediately.
          </p>
        </div>

        {/* Keep-Alive Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
              Keep-Alive
            </span>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
              Reuse TCP connections between requests.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.keep_alive}
            onClick={() => onChange({ ...config, keep_alive: !config.keep_alive })}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ background: config.keep_alive ? 'var(--rm-pass)' : 'var(--rm-border)' }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
              style={{ transform: config.keep_alive ? 'translateX(24px)' : 'translateX(4px)' }}
            />
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
