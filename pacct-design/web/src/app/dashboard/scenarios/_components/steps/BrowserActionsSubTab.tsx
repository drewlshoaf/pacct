'use client';

import type {
  ScenarioStep,
  StepConfig,
  BrowserAction,
  BrowserActionType,
  BrowserSelectorStrategy,
  BrowserWaitCondition,
} from '../../types';
import { create_default_browser_action } from '../../types';
import DynamicListEditor from '../DynamicListEditor';
import RmSelect from '@/components/ui/RmSelect';

const ACTION_TYPES: { value: BrowserActionType; label: string }[] = [
  { value: 'navigate', label: 'Navigate' },
  { value: 'click', label: 'Click' },
  { value: 'type', label: 'Type' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'wait', label: 'Wait' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'select', label: 'Select' },
  { value: 'hover', label: 'Hover' },
];

const SELECTOR_STRATEGIES: { value: BrowserSelectorStrategy; label: string }[] = [
  { value: 'css', label: 'CSS' },
  { value: 'xpath', label: 'XPath' },
  { value: 'text', label: 'Text' },
  { value: 'test_id', label: 'Test ID' },
];

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

export default function BrowserActionsSubTab({ step, errors, onSetConfig }: Props) {
  const config = step.config;
  const browser = config.browser!;
  const prefix = `step.${step.id}.config.browser.actions`;

  const setActions = (actions: BrowserAction[]) => {
    onSetConfig({
      ...config,
      browser: { ...browser, actions },
    });
  };

  const renderAction = (
    item: BrowserAction,
    index: number,
    update: <K extends keyof BrowserAction>(field: K, value: BrowserAction[K]) => void,
  ) => {
    const itemPrefix = `${prefix}[${index}]`;

    return (
      <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        {/* Row 1: Action Type + Selector Strategy */}
        <div className="flex items-center gap-2 flex-wrap">
          <RmSelect
            value={item.action_type}
            onChange={v => update('action_type', v as BrowserActionType)}
            options={ACTION_TYPES}
            size="sm"
          />

          <RmSelect
            value={item.selector_strategy}
            onChange={v => update('selector_strategy', v as BrowserSelectorStrategy)}
            options={SELECTOR_STRATEGIES}
            size="sm"
          />
        </div>

        {/* Row 2: Selector */}
        <div>
          <input
            type="text"
            value={item.selector}
            onChange={e => update('selector', e.target.value)}
            placeholder={
              item.selector_strategy === 'css' ? '#login-btn, .submit-form'
                : item.selector_strategy === 'xpath' ? '//button[@id="submit"]'
                : item.selector_strategy === 'text' ? 'Sign In'
                : 'login-button'
            }
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          {errors[`${itemPrefix}.selector`] && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.selector`]}</p>
          )}
        </div>

        {/* Row 3: Value */}
        <div>
          <input
            type="text"
            value={item.value}
            onChange={e => update('value', e.target.value)}
            placeholder={
              item.action_type === 'type' ? 'Text to type...'
                : item.action_type === 'navigate' ? 'https://example.com'
                : item.action_type === 'select' ? 'Option value'
                : item.action_type === 'scroll' ? 'Scroll offset (px)'
                : 'Value'
            }
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          {errors[`${itemPrefix}.value`] && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.value`]}</p>
          )}
        </div>

        {/* Row 4: Wait Condition + Timeout */}
        <div className="flex items-center gap-2 flex-wrap">
          <RmSelect
            value={item.wait_condition}
            onChange={v => update('wait_condition', v as BrowserWaitCondition)}
            options={WAIT_CONDITIONS}
            size="sm"
          />

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={item.wait_timeout_ms || ''}
              onChange={e => update('wait_timeout_ms', Number(e.target.value) || 0)}
              placeholder="5000"
              min={0}
              className="w-24 text-[13px] px-3 py-1.5 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>ms</span>
          </div>
        </div>

        {errors[`${itemPrefix}.wait_timeout_ms`] && (
          <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.wait_timeout_ms`]}</p>
        )}

        {/* Hint */}
        <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
          {item.action_type === 'navigate' && 'Navigate to a new URL within the browser session.'}
          {item.action_type === 'click' && 'Click on the element matched by the selector.'}
          {item.action_type === 'type' && 'Type the value text into the matched input element.'}
          {item.action_type === 'scroll' && 'Scroll the page or element by the specified pixel offset.'}
          {item.action_type === 'wait' && 'Wait for the specified condition before proceeding.'}
          {item.action_type === 'screenshot' && 'Capture a screenshot at this point in the action sequence.'}
          {item.action_type === 'select' && 'Select an option from a dropdown by its value.'}
          {item.action_type === 'hover' && 'Hover over the element matched by the selector.'}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
          Browser Actions
        </label>
        <p className="text-[11px] mb-3" style={{ color: 'var(--rm-text-muted)' }}>
          Define a sequence of browser actions to perform. Actions execute in order from top to bottom.
        </p>
      </div>

      {errors[prefix] && (
        <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[prefix]}</p>
      )}

      <DynamicListEditor
        items={browser.actions}
        onChange={setActions}
        renderItem={renderAction}
        createDefault={create_default_browser_action}
        addLabel="Add Action"
        emptyMessage="No actions defined. Add one to interact with the page."
        reorderable
      />
    </div>
  );
}
