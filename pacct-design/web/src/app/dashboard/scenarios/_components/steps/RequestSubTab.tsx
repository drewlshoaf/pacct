'use client';

import type {
  ScenarioStep,
  StepConfig,
  RestStepConfig,
  HttpMethod,
  Protocol,
} from '../../types';
import { HTTP_METHODS, METHOD_COLORS } from '../../types';
import ToggleButtonGroup from '../ToggleButtonGroup';
import KeyValueEditor from '../KeyValueEditor';

const PROTOCOLS: Protocol[] = ['HTTP/1.1', 'HTTP/2'];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onUpdateField: <K extends keyof ScenarioStep>(field: K, value: ScenarioStep[K]) => void;
  onSetConfig: (config: StepConfig) => void;
}

export default function RequestSubTab({
  step,
  errors,
  onUpdateField,
  onSetConfig,
}: Props) {
  const rest = step.config.rest!;
  const prefix = `step.${step.id}`;

  const updateRest = (patch: Partial<RestStepConfig>) => {
    onSetConfig({ ...step.config, rest: { ...rest, ...patch } });
  };

  return (
    <div className="space-y-5">
      {/* HTTP Method */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Method
        </label>
        <ToggleButtonGroup
          options={HTTP_METHODS.map(m => ({
            value: m,
            label: m,
            color: METHOD_COLORS[m],
          }))}
          value={rest.method}
          onChange={(v) => updateRest({ method: v as HttpMethod })}
          size="sm"
        />
      </div>

      {/* Step Name */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Step Name
        </label>
        <input
          type="text"
          value={step.name}
          onChange={e => onUpdateField('name', e.target.value)}
          placeholder="e.g. Fetch user profile"
          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          A descriptive label for this step in reports and logs.
        </p>
        {errors[`${prefix}.name`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.name`]}</p>
        )}
      </div>

      {/* Path */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Path
        </label>
        <input
          type="text"
          value={rest.path}
          onChange={e => updateRest({ path: e.target.value })}
          placeholder="/api/v1/users/{{userId}}"
          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          Relative to the scenario base URL. Supports {'{{variable}}'} interpolation.
        </p>
        {errors[`${prefix}.path`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.path`]}</p>
        )}
      </div>

      {/* Query Parameters */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Query Parameters
        </label>
        <KeyValueEditor
          entries={rest.query_params.map(p => ({ id: p.id, key: p.key, value: p.value }))}
          onChange={entries =>
            updateRest({
              query_params: entries.map(e => ({
                id: e.id,
                key: e.key,
                value: e.value,
                source: rest.query_params.find(p => p.id === e.id)?.source ?? 'static',
              }))
            })
          }
          keyPlaceholder="param"
          valuePlaceholder="value"
          addLabel="Add Parameter"
        />
      </div>

      {/* Headers */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Headers
        </label>
        <KeyValueEditor
          entries={rest.headers.map(h => ({ id: h.id, key: h.key, value: h.value }))}
          onChange={entries =>
            updateRest({
              headers: entries.map(e => ({
                id: e.id,
                key: e.key,
                value: e.value,
                source: rest.headers.find(h => h.id === e.id)?.source ?? 'static',
              }))
            })
          }
          keyPlaceholder="Header name"
          valuePlaceholder="Header value"
          addLabel="Add Header"
        />
      </div>

      {/* Protocol */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Protocol
        </label>
        <ToggleButtonGroup
          options={PROTOCOLS.map(p => ({ value: p, label: p }))}
          value={rest.protocol}
          onChange={(v) => updateRest({ protocol: v as Protocol })}
          size="sm"
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          HTTP/2 enables multiplexing for improved concurrency on supported servers.
        </p>
      </div>

      {/* Timeout */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Timeout (ms)
        </label>
        <input
          type="number"
          value={step.timeout_ms || ''}
          onChange={e => onUpdateField('timeout_ms', Number(e.target.value) || 0)}
          placeholder="0 (use scenario default)"
          min={0}
          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          Set to 0 to use the scenario-level default timeout.
        </p>
        {errors[`${prefix}.timeout_ms`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.timeout_ms`]}</p>
        )}
      </div>

      {/* Follow Redirects + Max Redirects */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: rest.follow_redirects ? 'var(--rm-signal)' : 'var(--rm-border)' }}
              onClick={() => updateRest({ follow_redirects: !rest.follow_redirects })}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{
                  background: 'var(--rm-text)',
                  left: rest.follow_redirects ? '18px' : '2px',
                }}
              />
            </div>
            <span className="text-[12px] font-medium" style={{ color: 'var(--rm-text-secondary)' }}>
              Follow Redirects
            </span>
          </label>
        </div>

        {rest.follow_redirects && (
          <div className="ml-11">
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Max Redirects
            </label>
            <input
              type="number"
              value={rest.max_redirects}
              onChange={e => updateRest({ max_redirects: Number(e.target.value) || 0 })}
              min={1}
              max={50}
              className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              Maximum number of redirect hops to follow (1-50).
            </p>
            {errors[`${prefix}.max_redirects`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.max_redirects`]}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
