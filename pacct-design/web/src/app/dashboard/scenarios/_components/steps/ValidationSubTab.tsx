'use client';

import type {
  ScenarioStep,
  StepAssertion,
  AssertionSource,
  AssertionOperator,
  StepType,
} from '../../types';
import { create_default_step_assertion } from '../../types';
import DynamicListEditor from '../DynamicListEditor';
import RmSelect from '@/components/ui/RmSelect';

const BASE_ASSERTION_SOURCES: { value: AssertionSource; label: string }[] = [
  { value: 'status', label: 'Status Code' },
  { value: 'header', label: 'Header' },
  { value: 'body', label: 'Body' },
  { value: 'response_time', label: 'Response Time' },
];

const GRAPHQL_ASSERTION_SOURCES: { value: AssertionSource; label: string }[] = [
  { value: 'status', label: 'Status Code' },
  { value: 'header', label: 'Header' },
  { value: 'graphql_data', label: 'GraphQL Data' },
  { value: 'graphql_errors', label: 'GraphQL Errors' },
  { value: 'body', label: 'Body' },
  { value: 'response_time', label: 'Response Time' },
];

const BROWSER_ASSERTION_SOURCES: { value: AssertionSource; label: string }[] = [
  { value: 'browser_element', label: 'Element' },
  { value: 'browser_url', label: 'URL' },
  { value: 'browser_title', label: 'Page Title' },
  { value: 'browser_cookie', label: 'Cookie' },
  { value: 'browser_local_storage', label: 'Local Storage' },
  { value: 'response_time', label: 'Response Time' },
];

function getAssertionSources(stepType: StepType): { value: AssertionSource; label: string }[] {
  switch (stepType) {
    case 'graphql': return GRAPHQL_ASSERTION_SOURCES;
    case 'browser': return BROWSER_ASSERTION_SOURCES;
    default: return BASE_ASSERTION_SOURCES;
  }
}

function getSourceHint(source: AssertionSource): string {
  switch (source) {
    case 'status': return 'Assert on the HTTP status code (e.g. 200, 201, 404).';
    case 'header': return 'Property is the header name. Use equals/contains to match the value.';
    case 'body': return 'Property supports JSONPath ($.data.id) or regex matching on the response body.';
    case 'response_time': return 'Assert that response time (in ms) is within acceptable bounds.';
    case 'graphql_data': return 'Assert on the GraphQL data field using JSONPath ($.user.name).';
    case 'graphql_errors': return 'Assert on GraphQL errors (e.g. check for absence or specific messages).';
    case 'browser_element': return 'Property is a CSS selector. Assert on element text, visibility, or existence.';
    case 'browser_url': return 'Assert on the current page URL after navigation.';
    case 'browser_title': return 'Assert on the current page title.';
    case 'browser_cookie': return 'Property is the cookie name. Assert on its value.';
    case 'browser_local_storage': return 'Property is the storage key. Assert on its value.';
    default: return '';
  }
}

const ASSERTION_OPERATORS: { value: AssertionOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
  { value: 'regex', label: 'matches regex' },
  { value: 'less_than', label: 'less than' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'json_path', label: 'JSON path' },
  { value: 'exists', label: 'exists' },
];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetAssertions: (assertions: StepAssertion[]) => void;
}

export default function ValidationSubTab({ step, errors, onSetAssertions }: Props) {
  const prefix = `step.${step.id}.assertions`;
  const sources = getAssertionSources(step.config.step_type);

  const needsProperty = (source: AssertionSource) =>
    ['header', 'body', 'graphql_data', 'graphql_errors',
     'browser_element', 'browser_cookie', 'browser_local_storage'].includes(source);

  const renderAssertion = (
    item: StepAssertion,
    index: number,
    update: <K extends keyof StepAssertion>(field: K, value: StepAssertion[K]) => void,
  ) => {
    const itemPrefix = `${prefix}[${index}]`;
    const showProperty = needsProperty(item.source);
    const needsExpected = item.operator !== 'exists';

    return (
      <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source */}
          <RmSelect
            value={item.source}
            onChange={v => update('source', v as AssertionSource)}
            options={sources}
            size="sm"
          />

          {/* Property */}
          {showProperty && (
            <input
              type="text"
              value={item.property}
              onChange={e => update('property', e.target.value)}
              placeholder={item.source === 'header' ? 'Content-Type' : '$.data.id'}
              className="flex-1 min-w-[120px] text-[12px] px-2 py-1.5 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          )}

          {/* Operator */}
          <RmSelect
            value={item.operator}
            onChange={v => update('operator', v as AssertionOperator)}
            options={ASSERTION_OPERATORS}
            size="sm"
          />

          {/* Expected value */}
          {needsExpected && (
            <input
              type="text"
              value={item.expected}
              onChange={e => update('expected', e.target.value)}
              placeholder="Expected value"
              className="flex-1 min-w-[100px] text-[12px] px-2 py-1.5 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
          )}
        </div>

        {errors[`${itemPrefix}.property`] && (
          <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.property`]}</p>
        )}
        {errors[`${itemPrefix}.expected`] && (
          <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[`${itemPrefix}.expected`]}</p>
        )}

        <p className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
          {getSourceHint(item.source)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
          Response Assertions
        </label>
        <p className="text-[11px] mb-3" style={{ color: 'var(--rm-text-muted)' }}>
          Define conditions that must be true for this step to be considered successful.
          Failed assertions are recorded as errors in the test report.
        </p>
      </div>

      {errors[prefix] && (
        <p className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{errors[prefix]}</p>
      )}

      <DynamicListEditor
        items={step.assertions}
        onChange={onSetAssertions}
        renderItem={renderAssertion}
        createDefault={create_default_step_assertion}
        addLabel="Add Assertion"
        emptyMessage="No assertions defined. Add one to validate responses."
        reorderable
      />
    </div>
  );
}
