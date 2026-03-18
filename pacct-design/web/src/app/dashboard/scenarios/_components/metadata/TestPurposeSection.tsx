'use client';

import SectionCard from '../SectionCard';
import type { PolicyMode } from '../../types';

const MODES: { value: PolicyMode; label: string; description: string }[] = [
  {
    value: 'SCOUT',
    label: 'Scout',
    description: 'Observational mode — collects metrics and flags issues without blocking.',
  },
  {
    value: 'FORENSICS',
    label: 'Forensics',
    description: 'Deep analysis mode — captures extended diagnostics for post-incident investigation.',
  },
];

interface Props {
  policyMode: PolicyMode;
  onChange: (mode: PolicyMode) => void;
}

export default function TestPurposeSection({ policyMode, onChange }: Props) {
  return (
    <SectionCard title="Evaluation Mode" description="How run results should be evaluated.">
      <div className="space-y-2">
        {MODES.map(mode => {
          const selected = policyMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(mode.value)}
              className="w-full text-left px-4 py-3 rounded-lg transition-colors"
              style={{
                background: selected ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                border: `1px solid ${selected ? 'var(--rm-signal)' : 'var(--rm-border)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2"
                  style={{
                    borderColor: selected ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
                    background: selected ? 'var(--rm-signal)' : 'transparent',
                  }}
                />
                <span className="text-[13px] font-medium" style={{ color: selected ? 'var(--rm-signal)' : 'var(--rm-text)' }}>
                  {mode.label}
                </span>
              </div>
              <p className="text-[11px] mt-1 ml-5" style={{ color: 'var(--rm-text-muted)' }}>
                {mode.description}
              </p>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
