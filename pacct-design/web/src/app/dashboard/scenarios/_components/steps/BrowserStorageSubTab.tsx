'use client';

import type {
  ScenarioStep,
  StepConfig,
  BrowserCookieOp,
  BrowserStorageOp,
} from '../../types';
import {
  create_default_browser_cookie_op,
  create_default_browser_storage_op,
} from '../../types';
import DynamicListEditor from '../DynamicListEditor';
import ToggleButtonGroup from '../ToggleButtonGroup';
import RmSelect from '@/components/ui/RmSelect';

const COOKIE_OPERATIONS: { value: BrowserCookieOp['operation']; label: string }[] = [
  { value: 'set', label: 'Set' },
  { value: 'delete', label: 'Delete' },
  { value: 'clear_all', label: 'Clear All' },
];

const STORAGE_OPERATIONS: { value: BrowserStorageOp['operation']; label: string }[] = [
  { value: 'set', label: 'Set' },
  { value: 'get', label: 'Get' },
  { value: 'delete', label: 'Delete' },
  { value: 'clear', label: 'Clear' },
];

const STORAGE_TYPES: { value: BrowserStorageOp['storage_type']; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'session', label: 'Session' },
];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetConfig: (config: StepConfig) => void;
}

export default function BrowserStorageSubTab({ step, errors, onSetConfig }: Props) {
  const config = step.config;
  const browser = config.browser!;
  const cookiePrefix = `step.${step.id}.config.browser.cookie_ops`;
  const storagePrefix = `step.${step.id}.config.browser.storage_ops`;

  const setCookieOps = (cookie_ops: BrowserCookieOp[]) => {
    onSetConfig({
      ...config,
      browser: { ...browser, cookie_ops },
    });
  };

  const setStorageOps = (storage_ops: BrowserStorageOp[]) => {
    onSetConfig({
      ...config,
      browser: { ...browser, storage_ops },
    });
  };

  const renderCookieOp = (
    item: BrowserCookieOp,
    index: number,
    update: <K extends keyof BrowserCookieOp>(field: K, value: BrowserCookieOp[K]) => void,
  ) => {
    const itemPrefix = `${cookiePrefix}[${index}]`;
    const showFields = item.operation !== 'clear_all';

    return (
      <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        {/* Operation */}
        <div>
          <RmSelect
            value={item.operation}
            onChange={v => update('operation', v as BrowserCookieOp['operation'])}
            options={COOKIE_OPERATIONS}
            size="sm"
          />
        </div>

        {showFields && (
          <>
            {/* Name */}
            <div>
              <input
                type="text"
                value={item.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Cookie name"
                className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              {errors[`${itemPrefix}.name`] && (
                <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.name`]}</p>
              )}
            </div>

            {/* Value (only for set) */}
            {item.operation === 'set' && (
              <div>
                <input
                  type="text"
                  value={item.value}
                  onChange={e => update('value', e.target.value)}
                  placeholder="Cookie value"
                  className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                {errors[`${itemPrefix}.value`] && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.value`]}</p>
                )}
              </div>
            )}

            {/* Domain + Path (only for set) */}
            {item.operation === 'set' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.domain}
                  onChange={e => update('domain', e.target.value)}
                  placeholder="Domain (e.g. .example.com)"
                  className="flex-1 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
                <input
                  type="text"
                  value={item.path}
                  onChange={e => update('path', e.target.value)}
                  placeholder="Path (e.g. /)"
                  className="w-32 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
              </div>
            )}
          </>
        )}

        {item.operation === 'clear_all' && (
          <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            All cookies will be cleared for the current browser session.
          </p>
        )}
      </div>
    );
  };

  const renderStorageOp = (
    item: BrowserStorageOp,
    index: number,
    update: <K extends keyof BrowserStorageOp>(field: K, value: BrowserStorageOp[K]) => void,
  ) => {
    const itemPrefix = `${storagePrefix}[${index}]`;
    const showKey = item.operation !== 'clear';
    const showValue = item.operation === 'set';

    return (
      <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        {/* Operation + Storage Type */}
        <div className="flex items-center gap-2 flex-wrap">
          <RmSelect
            value={item.operation}
            onChange={v => update('operation', v as BrowserStorageOp['operation'])}
            options={STORAGE_OPERATIONS}
            size="sm"
          />

          <ToggleButtonGroup
            options={STORAGE_TYPES}
            value={item.storage_type}
            onChange={(v) => update('storage_type', v as BrowserStorageOp['storage_type'])}
            size="sm"
          />
        </div>

        {/* Key */}
        {showKey && (
          <div>
            <input
              type="text"
              value={item.key}
              onChange={e => update('key', e.target.value)}
              placeholder="Storage key"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${itemPrefix}.key`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.key`]}</p>
            )}
          </div>
        )}

        {/* Value */}
        {showValue && (
          <div>
            <input
              type="text"
              value={item.value}
              onChange={e => update('value', e.target.value)}
              placeholder="Storage value"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${itemPrefix}.value`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.value`]}</p>
            )}
          </div>
        )}

        {item.operation === 'clear' && (
          <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            All entries in {item.storage_type === 'local' ? 'localStorage' : 'sessionStorage'} will be cleared.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Cookie Operations ── */}
      <div className="space-y-4">
        <div>
          <h4 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>Cookie Operations</h4>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
            Manage browser cookies before or during page interaction.
          </p>
        </div>

        {errors[cookiePrefix] && (
          <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[cookiePrefix]}</p>
        )}

        <DynamicListEditor
          items={browser.cookie_ops}
          onChange={setCookieOps}
          renderItem={renderCookieOp}
          createDefault={create_default_browser_cookie_op}
          addLabel="Add Cookie Operation"
          emptyMessage="No cookie operations defined."
          reorderable
        />
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid var(--rm-border)' }} />

      {/* ── Storage Operations ── */}
      <div className="space-y-4">
        <div>
          <h4 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>Storage Operations</h4>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
            Interact with localStorage and sessionStorage in the browser.
          </p>
        </div>

        {errors[storagePrefix] && (
          <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[storagePrefix]}</p>
        )}

        <DynamicListEditor
          items={browser.storage_ops}
          onChange={setStorageOps}
          renderItem={renderStorageOp}
          createDefault={create_default_browser_storage_op}
          addLabel="Add Storage Operation"
          emptyMessage="No storage operations defined."
          reorderable
        />
      </div>
    </div>
  );
}
