'use client';

import type {
  ScenarioStep,
  StepConfig,
  GraphQLOperationType,
} from '../../types';
import ToggleButtonGroup from '../ToggleButtonGroup';
import KeyValueEditor from '../KeyValueEditor';

const OPERATION_TYPES: { value: GraphQLOperationType; label: string }[] = [
  { value: 'query', label: 'Query' },
  { value: 'mutation', label: 'Mutation' },
  { value: 'subscription', label: 'Subscription' },
];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetConfig: (config: StepConfig) => void;
}

export default function GraphQLQuerySubTab({ step, errors, onSetConfig }: Props) {
  const gql = step.config.graphql!;
  const prefix = `step.${step.id}.config.graphql`;

  const update = <K extends keyof typeof gql>(field: K, value: (typeof gql)[K]) => {
    onSetConfig({ ...step.config, graphql: { ...gql, [field]: value } });
  };

  return (
    <div className="space-y-5">
      {/* Operation Type */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Operation Type
        </label>
        <ToggleButtonGroup
          options={OPERATION_TYPES}
          value={gql.operation_type}
          onChange={(v) => update('operation_type', v as GraphQLOperationType)}
          variant="pill"
          size="sm"
        />
      </div>

      {/* Endpoint */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Endpoint
        </label>
        <input
          type="text"
          value={gql.endpoint}
          onChange={e => update('endpoint', e.target.value)}
          placeholder="/graphql"
          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          Relative path to the GraphQL endpoint. Supports {'{{variable}}'} interpolation.
        </p>
        {errors[`${prefix}.endpoint`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.endpoint`]}</p>
        )}
      </div>

      {/* Query */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Query
        </label>
        <textarea
          value={gql.query}
          onChange={e => update('query', e.target.value)}
          placeholder={'query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n    email\n  }\n}'}
          rows={12}
          className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-y font-mono"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)', minHeight: '200px' }}
          spellCheck={false}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          The GraphQL query, mutation, or subscription document.
        </p>
        {errors[`${prefix}.query`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.query`]}</p>
        )}
      </div>

      {/* Variables */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Variables
        </label>
        <textarea
          value={gql.variables}
          onChange={e => update('variables', e.target.value)}
          placeholder={'{\n  "id": "123"\n}'}
          rows={6}
          className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-y font-mono"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)', minHeight: '100px' }}
          spellCheck={false}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          JSON object of variables to pass to the GraphQL operation. Supports {'{{variable}}'} interpolation within values.
        </p>
        {errors[`${prefix}.variables`] && (
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.variables`]}</p>
        )}
      </div>

      {/* Operation Name */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Operation Name{' '}
          <span className="font-normal" style={{ color: 'var(--rm-text-muted)' }}>(optional)</span>
        </label>
        <input
          type="text"
          value={gql.operation_name}
          onChange={e => update('operation_name', e.target.value)}
          placeholder="GetUser"
          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
        />
        <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
          Required when the query document contains multiple operations.
        </p>
      </div>

      {/* Headers */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Headers
        </label>
        <KeyValueEditor
          entries={gql.headers.map(h => ({ id: h.id, key: h.key, value: h.value }))}
          onChange={entries =>
            update(
              'headers',
              entries.map(e => ({
                id: e.id,
                key: e.key,
                value: e.value,
                source: gql.headers.find(h => h.id === e.id)?.source ?? 'static',
              }))
            )
          }
          keyPlaceholder="Header name"
          valuePlaceholder="Header value"
          addLabel="Add Header"
        />
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--rm-text-muted)' }}>
          Custom HTTP headers sent with the GraphQL request. Content-Type is set automatically.
        </p>
      </div>
    </div>
  );
}
