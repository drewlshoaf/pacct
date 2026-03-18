'use client';

import type { DurationConfig, DurationType, LoadPatternType } from '../../types';
import SectionCard from '../SectionCard';
import ToggleButtonGroup from '../ToggleButtonGroup';
import type { ToggleOption } from '../ToggleButtonGroup';

const durationOptions: ToggleOption<DurationType>[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'iterations', label: 'Iterations' },
  { value: 'continuous', label: 'Continuous' },
];

interface Props {
  duration: DurationConfig;
  patternType: LoadPatternType;
  onChange: (duration: DurationConfig) => void;
}

export default function DurationSection({ duration, patternType, onChange }: Props) {
  const disabled = patternType === 'custom' || patternType === 'step';
  const disabledMessage = patternType === 'custom'
    ? 'Custom stages define their own durations — total test time is the sum of all stage durations.'
    : patternType === 'step'
    ? 'Step pattern determines duration from step count × step duration.'
    : '';

  const setType = (type: DurationType) => {
    const base: DurationConfig = { type };
    switch (type) {
      case 'fixed':
        base.fixed = duration.fixed ?? { seconds: 300 };
        break;
      case 'iterations':
        base.iterations = duration.iterations ?? { count: 100, max_duration_seconds: 600 };
        break;
      case 'continuous':
        break;
    }
    onChange(base);
  };

  return (
    <SectionCard title="Duration" description="How long the test runs.">
      {disabled && (
        <div
          className="text-[11px] px-3 py-2 rounded-lg mb-3 flex items-start gap-2"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)', border: '1px solid var(--rm-border)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" style={{ color: 'var(--rm-caution)' }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {disabledMessage}
        </div>
      )}
      <div style={disabled ? { opacity: 0.35, pointerEvents: 'none' } : undefined}>
        <div className="space-y-4">
          <ToggleButtonGroup
            options={durationOptions}
            value={duration.type}
            onChange={setType}
            variant="pill"
          />

          {/* Fixed */}
          {duration.type === 'fixed' && (
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                Duration
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={duration.fixed?.seconds ?? 300}
                  onChange={e =>
                    onChange({ ...duration, fixed: { seconds: parseInt(e.target.value) || 0 } })
                  }
                  min={1}
                  className="w-32 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>seconds</span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
                Test will run for exactly this duration after ramp-up completes.
              </p>
            </div>
          )}

          {/* Iterations */}
          {duration.type === 'iterations' && (
            <div className="flex items-start gap-4">
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                  Iteration Count
                </label>
                <input
                  type="number"
                  value={duration.iterations?.count ?? 100}
                  onChange={e =>
                    onChange({
                      ...duration,
                      iterations: {
                        count: parseInt(e.target.value) || 0,
                        max_duration_seconds: duration.iterations?.max_duration_seconds ?? 600,
                      },
                    })
                  }
                  min={1}
                  className="w-32 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
                  Total iterations across all VUs.
                </p>
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                  Max Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={duration.iterations?.max_duration_seconds ?? 600}
                    onChange={e =>
                      onChange({
                        ...duration,
                        iterations: {
                          count: duration.iterations?.count ?? 100,
                          max_duration_seconds: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    min={0}
                    className="w-32 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>seconds</span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
                  Safety cap — test stops even if iterations are incomplete.
                </p>
              </div>
            </div>
          )}

          {/* Continuous */}
          {duration.type === 'continuous' && (
            <div
              className="text-[12px] px-3 py-2.5 rounded-lg"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' }}
            >
              The test will run indefinitely until manually stopped. Use with caution in production environments.
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
