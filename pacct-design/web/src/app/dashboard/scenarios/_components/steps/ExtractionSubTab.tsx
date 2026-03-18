'use client';

import type {
  ScenarioStep,
  Extraction,
  ExtractionSource,
  StepType,
} from '../../types';
import { create_default_extraction } from '../../types';
import DynamicListEditor from '../DynamicListEditor';
import RmSelect from '@/components/ui/RmSelect';

const BASE_EXTRACTION_SOURCES: { value: ExtractionSource; label: string }[] = [
  { value: 'body', label: 'Body' },
  { value: 'header', label: 'Header' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'response_time', label: 'Response Time' },
];

const GRAPHQL_EXTRACTION_SOURCES: { value: ExtractionSource; label: string }[] = [
  { value: 'graphql_data', label: 'GraphQL Data' },
  { value: 'body', label: 'Body' },
  { value: 'header', label: 'Header' },
  { value: 'cookie', label: 'Cookie' },
  { value: 'response_time', label: 'Response Time' },
];

const BROWSER_EXTRACTION_SOURCES: { value: ExtractionSource; label: string }[] = [
  { value: 'browser_element', label: 'Element' },
  { value: 'browser_url', label: 'URL' },
  { value: 'browser_cookie', label: 'Cookie' },
  { value: 'browser_local_storage', label: 'Local Storage' },
  { value: 'response_time', label: 'Response Time' },
];

function getExtractionSources(stepType: StepType): { value: ExtractionSource; label: string }[] {
  switch (stepType) {
    case 'graphql': return GRAPHQL_EXTRACTION_SOURCES;
    case 'browser': return BROWSER_EXTRACTION_SOURCES;
    default: return BASE_EXTRACTION_SOURCES;
  }
}

function getExtractionHint(source: ExtractionSource): string {
  switch (source) {
    case 'body': return 'Use JSONPath ($.data.id) or regex to extract a value from the response body.';
    case 'header': return 'Enter the response header name to extract its value.';
    case 'cookie': return 'Enter the cookie name to extract from the Set-Cookie header.';
    case 'response_time': return 'Captures the response time in milliseconds as a variable.';
    case 'graphql_data': return 'Use JSONPath ($.user.name) to extract from the GraphQL data field.';
    case 'browser_element': return 'Use a CSS selector to extract element text content.';
    case 'browser_url': return 'Extracts the current page URL.';
    case 'browser_cookie': return 'Enter the cookie name to extract its value.';
    case 'browser_local_storage': return 'Enter the localStorage key to extract its value.';
    default: return '';
  }
}

function getExpressionPlaceholder(source: ExtractionSource): string {
  switch (source) {
    case 'body':
    case 'graphql_data': return '$.data.token';
    case 'header': return 'X-Request-Id';
    case 'cookie':
    case 'browser_cookie': return 'session_id';
    case 'browser_element': return '.user-name';
    case 'browser_local_storage': return 'auth_token';
    default: return '';
  }
}

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetExtractions: (extractions: Extraction[]) => void;
}

export default function ExtractionSubTab({ step, errors, onSetExtractions }: Props) {
  const prefix = `step.${step.id}.extractions`;
  const sources = getExtractionSources(step.config.step_type);

  const renderExtraction = (
    item: Extraction,
    index: number,
    update: <K extends keyof Extraction>(field: K, value: Extraction[K]) => void,
  ) => {
    const itemPrefix = `${prefix}[${index}]`;

    return (
      <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        <div className="grid grid-cols-2 gap-2">
          {/* Source */}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--rm-text-muted)' }}>
              Source
            </label>
            <RmSelect
              value={item.source}
              onChange={v => update('source', v as ExtractionSource)}
              options={sources}
              size="sm"
            />
          </div>

          {/* Variable Name */}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--rm-text-muted)' }}>
              Variable Name
            </label>
            <input
              type="text"
              value={item.variable_name}
              onChange={e => update('variable_name', e.target.value)}
              placeholder="userId"
              className="w-full text-[12px] px-2 py-1.5 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${itemPrefix}.variable_name`] && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.variable_name`]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Expression */}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--rm-text-muted)' }}>
              Expression
            </label>
            <input
              type="text"
              value={item.expression}
              onChange={e => update('expression', e.target.value)}
              placeholder={getExpressionPlaceholder(item.source)}
              className="w-full text-[12px] px-2 py-1.5 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            {errors[`${itemPrefix}.expression`] && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.expression`]}</p>
            )}
          </div>

          {/* Default Value */}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--rm-text-muted)' }}>
              Default Value{' '}
              <span className="font-normal" style={{ color: 'var(--rm-text-muted)' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={item.default_value}
              onChange={e => update('default_value', e.target.value)}
              placeholder="fallback"
              className="w-full text-[12px] px-2 py-1.5 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          </div>
        </div>

        <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
          {getExtractionHint(item.source)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
          Variable Extractions
        </label>
        <p className="text-[11px] mb-3" style={{ color: 'var(--rm-text-muted)' }}>
          Extract values from the response and store them as variables for use in subsequent steps.
          Reference extracted values with {'{{variable_name}}'} syntax.
        </p>
      </div>

      {errors[prefix] && (
        <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[prefix]}</p>
      )}

      <DynamicListEditor
        items={step.extractions}
        onChange={onSetExtractions}
        renderItem={renderExtraction}
        createDefault={create_default_extraction}
        addLabel="Add Extraction"
        emptyMessage="No extractions defined. Add one to capture response data."
        reorderable
      />
    </div>
  );
}
