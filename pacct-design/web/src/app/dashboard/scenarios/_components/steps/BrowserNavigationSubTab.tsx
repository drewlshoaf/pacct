'use client';

import type {
  ScenarioStep,
  StepConfig,
  BrowserStepConfig,
  BrowserWaitCondition,
} from '../../types';
import ToggleButtonGroup from '../ToggleButtonGroup';

const WAIT_CONDITIONS: { value: BrowserWaitCondition; label: string }[] = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'network_idle', label: 'Network Idle' },
  { value: 'dom_ready', label: 'DOM Ready' },
  { value: 'timeout', label: 'Timeout' },
];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetConfig: (config: StepConfig) => void;
}

export default function BrowserNavigationSubTab({ step, errors, onSetConfig }: Props) {
  const config = step.config;
  const browser = config.browser!;
  const prefix = `step.${step.id}.config.browser`;

  const updateBrowser = (patch: Partial<BrowserStepConfig>) => {
    onSetConfig({
      ...config,
      browser: { ...browser, ...patch },
    });
  };

  return (
    <div className="space-y-5">
      {/* URL */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          URL
        </label>
        <input
          type="text"
          value={browser.url}
          onChange={e => updateBrowser({ url: e.target.value })}
          placeholder="https://example.com/login"
          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          The full URL to navigate to. Supports {'{{variable}}'} interpolation.
        </p>
        {errors[`${prefix}.url`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.url`]}</p>
        )}
      </div>

      {/* Viewport */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Viewport Size
        </label>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Width (px)
            </label>
            <input
              type="number"
              value={browser.viewport_width || ''}
              onChange={e => updateBrowser({ viewport_width: Number(e.target.value) || 0 })}
              placeholder="1280"
              min={0}
              className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${prefix}.viewport_width`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.viewport_width`]}</p>
            )}
          </div>
          <span className="text-[12px] pb-2" style={{ color: 'var(--rm-text-muted)' }}>x</span>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Height (px)
            </label>
            <input
              type="number"
              value={browser.viewport_height || ''}
              onChange={e => updateBrowser({ viewport_height: Number(e.target.value) || 0 })}
              placeholder="720"
              min={0}
              className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${prefix}.viewport_height`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.viewport_height`]}</p>
            )}
          </div>
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          Browser viewport dimensions in pixels. Common: 1280x720 (desktop), 375x812 (mobile).
        </p>
      </div>

      {/* Wait Until */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Wait Until
        </label>
        <ToggleButtonGroup
          options={WAIT_CONDITIONS}
          value={browser.wait_until}
          onChange={(v) => updateBrowser({ wait_until: v as BrowserWaitCondition })}
          size="sm"
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          {browser.wait_until === 'visible' && 'Wait until the target element is visible in the viewport.'}
          {browser.wait_until === 'hidden' && 'Wait until the target element is hidden from the viewport.'}
          {browser.wait_until === 'network_idle' && 'Wait until there are no pending network requests for 500ms.'}
          {browser.wait_until === 'dom_ready' && 'Wait until the DOM content has fully loaded.'}
          {browser.wait_until === 'timeout' && 'Wait for the specified timeout duration before proceeding.'}
        </p>
        {errors[`${prefix}.wait_until`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.wait_until`]}</p>
        )}
      </div>

      {/* Screenshot on Failure */}
      <div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: browser.screenshot_on_failure ? 'var(--rm-signal)' : 'var(--rm-border)' }}
              onClick={() => updateBrowser({ screenshot_on_failure: !browser.screenshot_on_failure })}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{
                  background: 'var(--rm-text)',
                  left: browser.screenshot_on_failure ? '18px' : '2px',
                }}
              />
            </div>
            <span className="text-[12px] font-medium" style={{ color: 'var(--rm-text-secondary)' }}>
              Screenshot on Failure
            </span>
          </label>
        </div>
        <p className="text-[11px] mt-1.5 ml-11" style={{ color: 'var(--rm-text-muted)' }}>
          Automatically capture a screenshot when this step fails for easier debugging.
        </p>
      </div>
    </div>
  );
}
