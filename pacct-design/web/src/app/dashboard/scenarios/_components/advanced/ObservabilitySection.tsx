'use client';

import type { ObservabilityConfig } from '../../types';
import SectionCard from '../SectionCard';

interface ObservabilitySectionProps {
  config: ObservabilityConfig;
  onChange: (config: ObservabilityConfig) => void;
}

export default function ObservabilitySection({ config, onChange }: ObservabilitySectionProps) {
  return (
    <SectionCard title="Observability">
      <div className="space-y-4">
        {/* Trace Injection Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
              Trace Injection
            </span>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
              Inject trace context headers into outgoing requests.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.trace_injection}
            onClick={() => onChange({ ...config, trace_injection: !config.trace_injection })}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            style={{ background: config.trace_injection ? 'var(--rm-pass)' : 'var(--rm-border)' }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform"
              style={{
                transform: config.trace_injection ? 'translateX(24px)' : 'translateX(4px)',
              }}
            />
          </button>
        </div>

        {/* OpenTelemetry Endpoint (conditional) */}
        {config.trace_injection && (
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
              OpenTelemetry Endpoint
            </label>
            <input
              type="text"
              value={config.otel_endpoint}
              onChange={(e) => onChange({ ...config, otel_endpoint: e.target.value })}
              placeholder="http://localhost:4318/v1/traces"
              className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
              OTLP HTTP endpoint for exporting trace spans.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
