'use client';

import SectionCard from '../SectionCard';

interface Props {
  baseUrl: string;
  defaultTimeoutMs: number;
  onBaseUrlChange: (v: string) => void;
  onTimeoutChange: (v: number) => void;
}

export default function EnvironmentSection({ baseUrl, defaultTimeoutMs, onBaseUrlChange, onTimeoutChange }: Props) {
  return (
    <SectionCard title="Environment" description="Base URL and default timeout applied to all steps.">
      <div className="space-y-4">
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => onBaseUrlChange(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full text-[13px] font-mono px-3 py-2.5 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>Step paths are appended to this base URL. Can be overridden per environment.</p>
        </div>

        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>Default Timeout</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={defaultTimeoutMs}
              onChange={e => onTimeoutChange(parseInt(e.target.value) || 0)}
              min={0}
              step={1000}
              className="w-32 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>ms</span>
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>Per-step timeout overrides take precedence. 0 = no timeout.</p>
        </div>
      </div>
    </SectionCard>
  );
}
