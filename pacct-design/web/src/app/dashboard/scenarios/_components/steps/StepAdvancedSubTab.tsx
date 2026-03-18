'use client';

import type {
  ScenarioStep,
  ThinkTimeConfig,
  ThinkTimeType,
  FailureConfig,
  FailureBehavior,
  BackoffStrategy,
} from '../../types';
import ToggleButtonGroup from '../ToggleButtonGroup';

const THINK_TIME_TYPES: { value: ThinkTimeType; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No delay between steps' },
  { value: 'fixed', label: 'Fixed', description: 'Constant delay' },
  { value: 'random', label: 'Random', description: 'Uniform random range' },
  { value: 'normal', label: 'Normal', description: 'Gaussian distribution' },
];

const FAILURE_BEHAVIORS: { value: FailureBehavior; label: string; description: string }[] = [
  { value: 'abort', label: 'Abort', description: 'Stop the virtual user on failure' },
  { value: 'retry', label: 'Retry', description: 'Retry with backoff strategy' },
  { value: 'continue', label: 'Continue', description: 'Log error and proceed' },
];

const BACKOFF_STRATEGIES: { value: BackoffStrategy; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'linear', label: 'Linear' },
  { value: 'exponential', label: 'Exponential' },
];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetThinkTime: (thinkTime: ThinkTimeConfig) => void;
  onSetFailure: (failure: FailureConfig) => void;
}

export default function StepAdvancedSubTab({ step, errors, onSetThinkTime, onSetFailure }: Props) {
  const { think_time, failure } = step;
  const ttPrefix = `step.${step.id}.think_time`;
  const fPrefix = `step.${step.id}.failure`;
  // ── Think Time helpers ──

  const setThinkTimeType = (type: ThinkTimeType) => {
    const next: ThinkTimeConfig = { type };
    if (type === 'fixed') next.fixed = think_time.fixed ?? { duration_ms: 1000 };
    if (type === 'random') next.random = think_time.random ?? { min_ms: 500, max_ms: 3000 };
    if (type === 'normal') next.normal = think_time.normal ?? { mean_ms: 1500, stddev_ms: 500 };
    onSetThinkTime(next);
  };

  // ── Failure helpers ──

  const defaultRetryOn = ['500', '502', '503', '504'];

  const setFailureBehavior = (behavior: FailureBehavior) => {
    const next: FailureConfig = { behavior };
    if (behavior === 'retry') {
      next.retry = failure.retry ?? {
        max_retries: 3,
        backoff_ms: 1000,
        backoff_strategy: 'exponential',
        retry_on: defaultRetryOn,
      };
    }
    onSetFailure(next);
  };

  const updateRetry = (field: string, value: unknown) => {
    onSetFailure({
      ...failure,
      retry: {
        max_retries: failure.retry?.max_retries ?? 3,
        backoff_ms: failure.retry?.backoff_ms ?? 1000,
        backoff_strategy: failure.retry?.backoff_strategy ?? 'exponential',
        retry_on: failure.retry?.retry_on ?? defaultRetryOn,
        [field]: value,
      },
    });
  };

  const retryOnLabel = 'Retry On Status Codes';
  const retryOnHint = 'Comma-separated HTTP status codes that should trigger a retry.';
  const retryOnPlaceholder = '500, 502, 503, 504';

  return (
    <div className="space-y-6">
      {/* ── Think Time ── */}
      <div className="space-y-4">
        <div>
          <h4 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>Think Time</h4>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
            Simulate realistic user pauses between this step and the next.
          </p>
        </div>

        <ToggleButtonGroup
          options={THINK_TIME_TYPES.map(t => ({ value: t.value, label: t.label, description: t.description }))}
          value={think_time.type}
          onChange={(v) => setThinkTimeType(v as ThinkTimeType)}
          variant="card"
        />

        {/* Fixed */}
        {think_time.type === 'fixed' && (
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Duration (ms)
            </label>
            <input
              type="number"
              value={think_time.fixed?.duration_ms ?? 1000}
              onChange={e =>
                onSetThinkTime({ ...think_time, fixed: { duration_ms: Number(e.target.value) || 0 } })
              }
              min={0}
              className="w-40 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${ttPrefix}.fixed.duration_ms`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${ttPrefix}.fixed.duration_ms`]}</p>
            )}
          </div>
        )}

        {/* Random */}
        {think_time.type === 'random' && (
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Min (ms)
              </label>
              <input
                type="number"
                value={think_time.random?.min_ms ?? 500}
                onChange={e =>
                  onSetThinkTime({
                    ...think_time,
                    random: { min_ms: Number(e.target.value) || 0, max_ms: think_time.random?.max_ms ?? 3000 },
                  })
                }
                min={0}
                className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              {errors[`${ttPrefix}.random.min_ms`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${ttPrefix}.random.min_ms`]}</p>
              )}
            </div>
            <span className="text-[12px] pb-2" style={{ color: 'var(--rm-text-muted)' }}>to</span>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Max (ms)
              </label>
              <input
                type="number"
                value={think_time.random?.max_ms ?? 3000}
                onChange={e =>
                  onSetThinkTime({
                    ...think_time,
                    random: { min_ms: think_time.random?.min_ms ?? 500, max_ms: Number(e.target.value) || 0 },
                  })
                }
                min={0}
                className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              {errors[`${ttPrefix}.random.max_ms`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${ttPrefix}.random.max_ms`]}</p>
              )}
            </div>
          </div>
        )}

        {/* Normal */}
        {think_time.type === 'normal' && (
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Mean (ms)
              </label>
              <input
                type="number"
                value={think_time.normal?.mean_ms ?? 1500}
                onChange={e =>
                  onSetThinkTime({
                    ...think_time,
                    normal: { mean_ms: Number(e.target.value) || 0, stddev_ms: think_time.normal?.stddev_ms ?? 500 },
                  })
                }
                min={0}
                className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              {errors[`${ttPrefix}.normal.mean_ms`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${ttPrefix}.normal.mean_ms`]}</p>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Std Dev (ms)
              </label>
              <input
                type="number"
                value={think_time.normal?.stddev_ms ?? 500}
                onChange={e =>
                  onSetThinkTime({
                    ...think_time,
                    normal: { mean_ms: think_time.normal?.mean_ms ?? 1500, stddev_ms: Number(e.target.value) || 0 },
                  })
                }
                min={0}
                className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              {errors[`${ttPrefix}.normal.stddev_ms`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${ttPrefix}.normal.stddev_ms`]}</p>
              )}
            </div>
          </div>
        )}

        {think_time.type === 'none' && (
          <p className="text-[12px] py-1" style={{ color: 'var(--rm-text-muted)' }}>
            No delay will be added after this step.
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--rm-border)' }} />

      {/* ── Failure Behavior ── */}
      <div className="space-y-4">
        <div>
          <h4 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>Failure Behavior</h4>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
            What happens when this step fails an assertion or encounters a network error.
          </p>
        </div>

        <ToggleButtonGroup
          options={FAILURE_BEHAVIORS.map(f => ({
            value: f.value,
            label: f.label,
            description: f.description,
            color: f.value === 'abort' ? 'var(--rm-fail)' : f.value === 'retry' ? 'var(--rm-caution)' : 'var(--rm-pass)',
          }))}
          value={failure.behavior}
          onChange={(v) => setFailureBehavior(v as FailureBehavior)}
          variant="card"
        />

        {/* Retry Config */}
        {failure.behavior === 'retry' && (
          <div
            className="space-y-4 p-4 rounded-lg"
            style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                  Max Retries
                </label>
                <input
                  type="number"
                  value={failure.retry?.max_retries ?? 3}
                  onChange={e => updateRetry('max_retries', Number(e.target.value) || 0)}
                  min={1}
                  max={20}
                  className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                {errors[`${fPrefix}.retry.max_retries`] && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${fPrefix}.retry.max_retries`]}</p>
                )}
              </div>
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                  Base Backoff (ms)
                </label>
                <input
                  type="number"
                  value={failure.retry?.backoff_ms ?? 1000}
                  onChange={e => updateRetry('backoff_ms', Number(e.target.value) || 0)}
                  min={0}
                  className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                {errors[`${fPrefix}.retry.backoff_ms`] && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${fPrefix}.retry.backoff_ms`]}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                Backoff Strategy
              </label>
              <ToggleButtonGroup
                options={BACKOFF_STRATEGIES}
                value={failure.retry?.backoff_strategy ?? 'exponential'}
                onChange={(v) => updateRetry('backoff_strategy', v)}
                size="sm"
              />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--rm-text-muted)' }}>
                {failure.retry?.backoff_strategy === 'fixed' && 'Wait the same duration between each retry attempt.'}
                {failure.retry?.backoff_strategy === 'linear' && 'Increase wait time linearly (base * attempt number).'}
                {failure.retry?.backoff_strategy === 'exponential' && 'Double the wait time after each attempt (base * 2^attempt).'}
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
                {retryOnLabel}
              </label>
              <input
                type="text"
                value={(failure.retry?.retry_on ?? []).join(', ')}
                onChange={e => {
                  const codes = e.target.value
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s.length > 0);
                  updateRetry('retry_on', codes);
                }}
                placeholder={retryOnPlaceholder}
                className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
                {retryOnHint}
              </p>
              {errors[`${fPrefix}.retry.retry_on`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${fPrefix}.retry.retry_on`]}</p>
              )}
            </div>
          </div>
        )}

        {failure.behavior === 'abort' && (
          <p className="text-[12px] py-1" style={{ color: 'var(--rm-text-muted)' }}>
            The virtual user will stop executing remaining steps if this step fails.
          </p>
        )}

        {failure.behavior === 'continue' && (
          <p className="text-[12px] py-1" style={{ color: 'var(--rm-text-muted)' }}>
            Failures will be logged but the virtual user will continue to the next step.
          </p>
        )}
      </div>
    </div>
  );
}
