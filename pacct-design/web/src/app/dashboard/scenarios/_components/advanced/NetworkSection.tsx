'use client';

import type { NetworkConfig, KeyValuePair } from '../../types';
import SectionCard from '../SectionCard';
import KeyValueEditor from '../KeyValueEditor';

interface NetworkSectionProps {
  config: NetworkConfig;
  onChange: (config: NetworkConfig) => void;
}

export default function NetworkSection({ config, onChange }: NetworkSectionProps) {
  const handleDnsChange = (entries: { id: string; key: string; value: string }[]) => {
    const pairs: KeyValuePair[] = entries.map((e) => ({
      id: e.id,
      key: e.key,
      value: e.value,
    }));
    onChange({ ...config, dns_overrides: pairs });
  };

  return (
    <SectionCard title="Network">
      <div className="space-y-4">
        {/* Proxy URL */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
            Proxy URL
          </label>
          <input
            type="text"
            value={config.proxy_url}
            onChange={(e) => onChange({ ...config, proxy_url: e.target.value })}
            placeholder="http://proxy.example.com:8080"
            className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            Route all requests through this HTTP/SOCKS proxy.
          </p>
        </div>

        {/* Proxy Auth */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
              Proxy Username
            </label>
            <input
              type="text"
              value={config.proxy_auth.username}
              onChange={(e) =>
                onChange({
                  ...config,
                  proxy_auth: { ...config.proxy_auth, username: e.target.value },
                })
              }
              placeholder="username"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
              Proxy Password
            </label>
            <input
              type="password"
              value={config.proxy_auth.password}
              onChange={(e) =>
                onChange({
                  ...config,
                  proxy_auth: { ...config.proxy_auth, password: e.target.value },
                })
              }
              placeholder="password"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          </div>
        </div>
        <p className="text-[11px] -mt-2" style={{ color: 'var(--rm-text-muted)' }}>
          Credentials for proxy authentication. Leave empty if not required.
        </p>

        {/* DNS Overrides */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
            DNS Overrides
          </label>
          <KeyValueEditor
            entries={config.dns_overrides}
            onChange={handleDnsChange}
            keyPlaceholder="Hostname"
            valuePlaceholder="IP Address"
            addLabel="Add Override"
          />
          <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            Map hostnames to specific IP addresses, bypassing DNS resolution.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
