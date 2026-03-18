'use client';

import type { ThinkTimeConfig, ThinkTimeType } from '../../types';
import SectionCard from '../SectionCard';
import ToggleButtonGroup from '../ToggleButtonGroup';
import type { ToggleOption } from '../ToggleButtonGroup';

const thinkTimeOptions: ToggleOption<ThinkTimeType>[] = [
  { value: 'none', label: 'None', description: 'No delay between steps' },
  { value: 'fixed', label: 'Fixed', description: 'Constant delay between steps' },
  { value: 'random', label: 'Random', description: 'Uniform random delay in a range' },
  { value: 'normal', label: 'Normal', description: 'Normally distributed delay' },
];

interface Props {
  thinkTime: ThinkTimeConfig;
  onChange: (config: ThinkTimeConfig) => void;
}

export default function ThinkTimeDefaultsSection({ thinkTime, onChange }: Props) {
  const setType = (type: ThinkTimeType) => {
    const base: ThinkTimeConfig = { type };
    switch (type) {
      case 'none':
        break;
      case 'fixed':
        base.fixed = thinkTime.fixed ?? { duration_ms: 1000 };
        break;
      case 'random':
        base.random = thinkTime.random ?? { min_ms: 500, max_ms: 3000 };
        break;
      case 'normal':
        base.normal = thinkTime.normal ?? { mean_ms: 1000, stddev_ms: 200 };
        break;
    }
    onChange(base);
  };

  return (
    <SectionCard title="Think Time Defaults" description="Default delay between steps for all virtual users.">
      <div className="space-y-4">
        <ToggleButtonGroup
          options={thinkTimeOptions}
          value={thinkTime.type}
          onChange={setType}
          variant="card"
        />

        {/* Fixed */}
        {thinkTime.type === 'fixed' && thinkTime.fixed && (
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
              Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={thinkTime.fixed.duration_ms}
                onChange={e =>
                  onChange({ ...thinkTime, fixed: { duration_ms: parseInt(e.target.value) || 0 } })
                }
                min={0}
                className="w-32 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>ms</span>
            </div>
          </div>
        )}

        {/* Random */}
        {thinkTime.type === 'random' && thinkTime.random && (
          <div className="flex items-start gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                Min
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thinkTime.random.min_ms}
                  onChange={e =>
                    onChange({
                      ...thinkTime,
                      random: { ...thinkTime.random!, min_ms: parseInt(e.target.value) || 0 },
                    })
                  }
                  min={0}
                  className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>ms</span>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                Max
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thinkTime.random.max_ms}
                  onChange={e =>
                    onChange({
                      ...thinkTime,
                      random: { ...thinkTime.random!, max_ms: parseInt(e.target.value) || 0 },
                    })
                  }
                  min={0}
                  className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Normal */}
        {thinkTime.type === 'normal' && thinkTime.normal && (
          <div className="flex items-start gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                Mean
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thinkTime.normal.mean_ms}
                  onChange={e =>
                    onChange({
                      ...thinkTime,
                      normal: { ...thinkTime.normal!, mean_ms: parseInt(e.target.value) || 0 },
                    })
                  }
                  min={0}
                  className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>ms</span>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
                Std Dev
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thinkTime.normal.stddev_ms}
                  onChange={e =>
                    onChange({
                      ...thinkTime,
                      normal: { ...thinkTime.normal!, stddev_ms: parseInt(e.target.value) || 0 },
                    })
                  }
                  min={0}
                  className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>ms</span>
              </div>
            </div>
          </div>
        )}

        <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
          Per-step think time overrides take precedence.
        </p>
      </div>
    </SectionCard>
  );
}
