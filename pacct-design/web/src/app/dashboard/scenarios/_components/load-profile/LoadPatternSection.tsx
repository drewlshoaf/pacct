'use client';

import type {
  LoadPatternConfig,
  LoadPatternType,
  CustomStage,
} from '../../types';
import { create_default_custom_stage } from '../../types';
import SectionCard from '../SectionCard';
import ToggleButtonGroup from '../ToggleButtonGroup';
import DynamicListEditor from '../DynamicListEditor';
import type { ToggleOption } from '../ToggleButtonGroup';

const patternOptions: ToggleOption<LoadPatternType>[] = [
  { value: 'constant', label: 'Constant', description: 'Steady load at configured VU count' },
  { value: 'linear', label: 'Linear', description: 'Linearly ramp between start and end VUs' },
  { value: 'step', label: 'Step', description: 'Step up VUs in fixed increments' },
  { value: 'spike', label: 'Spike', description: 'Sudden burst to spike VUs then back to base' },
  { value: 'soak', label: 'Soak', description: 'Extended duration at constant VUs' },
  { value: 'stress', label: 'Stress', description: 'Progressive increase through stages to peak' },
  { value: 'custom', label: 'Custom', description: 'Define custom VU stages' },
];

interface Props {
  pattern: LoadPatternConfig;
  onChange: (pattern: LoadPatternConfig) => void;
}

export default function LoadPatternSection({ pattern, onChange }: Props) {
  const setType = (type: LoadPatternType) => {
    const base: LoadPatternConfig = { type };
    switch (type) {
      case 'constant':
        break;
      case 'linear':
        base.linear = pattern.linear ?? { start_vus: 1, end_vus: 50 };
        break;
      case 'step':
        base.step = pattern.step ?? { start_vus: 0, step_size: 10, step_duration_seconds: 60, step_count: 5 };
        break;
      case 'spike':
        base.spike = pattern.spike ?? { base_vus: 10, spike_vus: 100, spike_duration_seconds: 30 };
        break;
      case 'soak':
        break;
      case 'stress':
        base.stress = pattern.stress ?? { start_vus: 10, peak_vus: 200, stages: 5 };
        break;
      case 'custom':
        base.custom = pattern.custom ?? { stages: [create_default_custom_stage()] };
        break;
    }
    onChange(base);
  };

  return (
    <SectionCard title="Load Pattern" description="How virtual user load is shaped over time.">
      <div className="space-y-4">
        <ToggleButtonGroup
          options={patternOptions}
          value={pattern.type}
          onChange={setType}
          variant="card"
        />

        {/* Linear config */}
        {pattern.type === 'linear' && pattern.linear && (
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Start VUs</label>
              <input
                type="number"
                value={pattern.linear.start_vus}
                onChange={e => onChange({ ...pattern, linear: { ...pattern.linear!, start_vus: parseInt(e.target.value) || 0 } })}
                min={0}
                className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>End VUs</label>
              <input
                type="number"
                value={pattern.linear.end_vus}
                onChange={e => onChange({ ...pattern, linear: { ...pattern.linear!, end_vus: parseInt(e.target.value) || 0 } })}
                min={0}
                className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
          </div>
        )}

        {/* Step config */}
        {pattern.type === 'step' && pattern.step && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Start VUs</label>
              <input
                type="number"
                value={pattern.step.start_vus}
                onChange={e => onChange({ ...pattern, step: { ...pattern.step!, start_vus: parseInt(e.target.value) || 0 } })}
                min={0}
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Step Size</label>
              <input
                type="number"
                value={pattern.step.step_size}
                onChange={e => onChange({ ...pattern, step: { ...pattern.step!, step_size: parseInt(e.target.value) || 0 } })}
                min={1}
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Step Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pattern.step.step_duration_seconds}
                  onChange={e => onChange({ ...pattern, step: { ...pattern.step!, step_duration_seconds: parseInt(e.target.value) || 0 } })}
                  min={1}
                  className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--rm-text-muted)' }}>sec</span>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Step Count</label>
              <input
                type="number"
                value={pattern.step.step_count}
                onChange={e => onChange({ ...pattern, step: { ...pattern.step!, step_count: parseInt(e.target.value) || 0 } })}
                min={1}
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
          </div>
        )}

        {/* Spike config */}
        {pattern.type === 'spike' && pattern.spike && (
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Base VUs</label>
              <input
                type="number"
                value={pattern.spike.base_vus}
                onChange={e => onChange({ ...pattern, spike: { ...pattern.spike!, base_vus: parseInt(e.target.value) || 0 } })}
                min={0}
                className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Spike VUs</label>
              <input
                type="number"
                value={pattern.spike.spike_vus}
                onChange={e => onChange({ ...pattern, spike: { ...pattern.spike!, spike_vus: parseInt(e.target.value) || 0 } })}
                min={0}
                className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Spike Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pattern.spike.spike_duration_seconds}
                  onChange={e => onChange({ ...pattern, spike: { ...pattern.spike!, spike_duration_seconds: parseInt(e.target.value) || 0 } })}
                  min={1}
                  className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--rm-text-muted)' }}>sec</span>
              </div>
            </div>
          </div>
        )}

        {/* Stress config */}
        {pattern.type === 'stress' && pattern.stress && (
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Start VUs</label>
              <input
                type="number"
                value={pattern.stress.start_vus}
                onChange={e => onChange({ ...pattern, stress: { ...pattern.stress!, start_vus: parseInt(e.target.value) || 0 } })}
                min={0}
                className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Peak VUs</label>
              <input
                type="number"
                value={pattern.stress.peak_vus}
                onChange={e => onChange({ ...pattern, stress: { ...pattern.stress!, peak_vus: parseInt(e.target.value) || 0 } })}
                min={0}
                className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>Stages</label>
              <input
                type="number"
                value={pattern.stress.stages}
                onChange={e => onChange({ ...pattern, stress: { ...pattern.stress!, stages: parseInt(e.target.value) || 0 } })}
                min={1}
                className="w-28 text-[13px] px-3 py-2.5 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
            </div>
          </div>
        )}

        {/* Custom stages */}
        {pattern.type === 'custom' && (
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Custom Stages
            </label>
            <DynamicListEditor<CustomStage>
              items={pattern.custom?.stages ?? []}
              onChange={stages => onChange({ ...pattern, custom: { stages } })}
              createDefault={create_default_custom_stage}
              addLabel="Add Stage"
              emptyMessage="No custom stages defined."
              reorderable
              renderItem={(item, _index, update) => (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>VUs</label>
                    <input
                      type="number"
                      value={item.vus}
                      onChange={e => update('vus', parseInt(e.target.value) || 0)}
                      min={0}
                      className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                      style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Duration (sec)</label>
                    <input
                      type="number"
                      value={item.duration_seconds}
                      onChange={e => update('duration_seconds', parseInt(e.target.value) || 0)}
                      min={1}
                      className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                      style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
}
