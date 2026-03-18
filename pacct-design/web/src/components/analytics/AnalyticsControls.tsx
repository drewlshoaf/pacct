'use client';

import type { AnalyticsScope, TimeWindow } from '@/data/types';

const scopeOptions: { value: AnalyticsScope; label: string }[] = [
  { value: 'global', label: 'Global' },
  { value: 'scenario', label: 'Scenario' },
];

const windowOptions: { value: TimeWindow; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

function SegmentedGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors"
            style={{
              background: active ? 'var(--rm-bg-surface)' : 'transparent',
              color: active ? 'var(--rm-text)' : 'var(--rm-text-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AnalyticsControls({
  scope,
  onScopeChange,
  window,
  onWindowChange,
}: {
  scope: AnalyticsScope;
  onScopeChange: (v: AnalyticsScope) => void;
  window: TimeWindow;
  onWindowChange: (v: TimeWindow) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <SegmentedGroup options={scopeOptions} value={scope} onChange={onScopeChange} />
      <SegmentedGroup options={windowOptions} value={window} onChange={onWindowChange} />
    </div>
  );
}
