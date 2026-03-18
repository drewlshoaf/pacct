'use client';

import type { ProtocolConfig } from '../../types';
import SectionCard from '../SectionCard';

interface ProtocolSectionProps {
  config: ProtocolConfig;
  onChange: (config: ProtocolConfig) => void;
}

export default function ProtocolSection({ config, onChange }: ProtocolSectionProps) {
  return (
    <SectionCard title="Protocol">
      <div className="space-y-4">
        {/* HTTP/2 Multiplexing Limit */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
            HTTP/2 Multiplexing Limit
          </label>
          <input
            type="number"
            min={1}
            value={config.http2_multiplexing_limit}
            onChange={(e) =>
              onChange({
                ...config,
                http2_multiplexing_limit: Math.max(1, parseInt(e.target.value) || 1),
              })
            }
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            Maximum concurrent streams per HTTP/2 connection.
          </p>
        </div>

        {/* TLS Verify Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
              TLS Verify
            </span>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
              Validate server certificates during TLS handshake.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.tls_verify}
            onClick={() => onChange({ ...config, tls_verify: !config.tls_verify })}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ background: config.tls_verify ? 'var(--rm-pass)' : 'var(--rm-border)' }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
              style={{ transform: config.tls_verify ? 'translateX(24px)' : 'translateX(4px)' }}
            />
          </button>
        </div>

        {/* Certificate Path (conditional) */}
        {config.tls_verify && (
          <>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
                Certificate Path
              </label>
              <input
                type="text"
                value={config.cert_path}
                onChange={(e) => onChange({ ...config, cert_path: e.target.value })}
                placeholder="/path/to/cert.pem"
                className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
                Path to the TLS client certificate file.
              </p>
            </div>

            {/* Key Path (conditional) */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
                Key Path
              </label>
              <input
                type="text"
                value={config.key_path}
                onChange={(e) => onChange({ ...config, key_path: e.target.value })}
                placeholder="/path/to/key.pem"
                className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
                Path to the TLS private key file.
              </p>
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
