'use client';

import type { RampConfig, RampCurve, LoadPatternType } from '../../types';
import SectionCard from '../SectionCard';
import ToggleButtonGroup from '../ToggleButtonGroup';
import type { ToggleOption } from '../ToggleButtonGroup';

const curveOptions: ToggleOption<RampCurve>[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease_in', label: 'Ease In' },
  { value: 'ease_out', label: 'Ease Out' },
];

const PATTERN_LABELS: Record<LoadPatternType, string> = {
  constant: 'Constant', linear: 'Linear', step: 'Step',
  spike: 'Spike', soak: 'Soak', stress: 'Stress', custom: 'Custom',
};

interface Props {
  virtualUsers: number;
  rampUp: RampConfig;
  rampDown: RampConfig;
  patternType: LoadPatternType;
  onVirtualUsersChange: (v: number) => void;
  onRampUpChange: (ramp: RampConfig) => void;
  onRampDownChange: (ramp: RampConfig) => void;
  errors: Record<string, string>;
}

function DisabledNotice({ message }: { message: string }) {
  return (
    <div
      className="text-[11px] px-3 py-2 rounded-lg mb-3 flex items-start gap-2"
      style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)', border: '1px solid var(--rm-border)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" style={{ color: 'var(--rm-caution)' }}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {message}
    </div>
  );
}

export default function VirtualUsersSection({
  virtualUsers,
  rampUp,
  rampDown,
  patternType,
  onVirtualUsersChange,
  onRampUpChange,
  onRampDownChange,
  errors,
}: Props) {
  const patternManagesVUs = patternType !== 'constant' && patternType !== 'soak';
  const label = PATTERN_LABELS[patternType];

  return (
    <SectionCard title="Virtual Users" description="Configure concurrent virtual user count and ramp behavior.">
      <div className="space-y-5">
        {/* VU Count */}
        <div>
          {patternManagesVUs && (
            <DisabledNotice message={`${label} pattern defines its own VU counts — this field is not used.`} />
          )}
          <div style={patternManagesVUs ? { opacity: 0.35, pointerEvents: 'none' } : undefined}>
            <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--rm-text)' }}>
              Virtual User Count
            </label>
            <input
              type="number"
              value={virtualUsers}
              onChange={e => onVirtualUsersChange(parseInt(e.target.value) || 0)}
              min={1}
              className="w-40 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              Number of concurrent virtual users to simulate.
            </p>
            {errors['load_profile.virtual_users'] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>
                {errors['load_profile.virtual_users']}
              </p>
            )}
          </div>
        </div>

        {/* Ramp Up */}
        <div>
          {patternManagesVUs && (
            <DisabledNotice message={`${label} pattern manages its own VU transitions — ramp up is not used.`} />
          )}
          <div style={patternManagesVUs ? { opacity: 0.35, pointerEvents: 'none' } : undefined}>
            <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--rm-text)' }}>
              Ramp Up
            </label>
            <div className="flex items-center gap-4 mb-2">
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                  Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={rampUp.duration_seconds}
                    onChange={e =>
                      onRampUpChange({ ...rampUp, duration_seconds: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>seconds</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Curve
              </label>
              <ToggleButtonGroup
                options={curveOptions}
                value={rampUp.curve}
                onChange={curve => onRampUpChange({ ...rampUp, curve })}
                variant="pill"
              />
            </div>
          </div>
        </div>

        {/* Ramp Down */}
        <div>
          {patternManagesVUs && (
            <DisabledNotice message={`${label} pattern manages its own VU transitions — ramp down is not used.`} />
          )}
          <div style={patternManagesVUs ? { opacity: 0.35, pointerEvents: 'none' } : undefined}>
            <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--rm-text)' }}>
              Ramp Down
            </label>
            <div className="flex items-center gap-4 mb-2">
              <div>
                <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                  Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={rampDown.duration_seconds}
                    onChange={e =>
                      onRampDownChange({ ...rampDown, duration_seconds: parseInt(e.target.value) || 0 })
                    }
                    min={0}
                    className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                  <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>seconds</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Curve
              </label>
              <ToggleButtonGroup
                options={curveOptions}
                value={rampDown.curve}
                onChange={curve => onRampDownChange({ ...rampDown, curve })}
                variant="pill"
              />
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
