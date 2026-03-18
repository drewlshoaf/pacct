'use client';

import type {
  ScenarioStep,
  StepConfig,
  PayloadConfig,
  ContentType,
  MultipartField,
  MultipartFieldType,
} from '../../types';
import { BODY_CONTENT_TYPES, create_default_multipart_field } from '../../types';
import ToggleButtonGroup from '../ToggleButtonGroup';
import KeyValueEditor from '../KeyValueEditor';
import DynamicListEditor from '../DynamicListEditor';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  none: 'None',
  json: 'JSON',
  form_urlencoded: 'Form URL-Encoded',
  multipart: 'Multipart',
  raw: 'Raw',
  xml: 'XML',
  binary: 'Binary',
  graphql: 'GraphQL',
};

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'none', label: 'None' },
  ...BODY_CONTENT_TYPES.map(ct => ({ value: ct, label: CONTENT_TYPE_LABELS[ct] })),
];

const MULTIPART_FIELD_TYPES: { value: MultipartFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'file', label: 'File' },
];

interface Props {
  step: ScenarioStep;
  errors: Record<string, string>;
  onSetConfig: (config: StepConfig) => void;
}

export default function PayloadSubTab({ step, errors, onSetConfig }: Props) {
  const rest = step.config.rest!;
  const { payload } = rest;
  const prefix = `step.${step.id}.payload`;

  const setPayload = (next: PayloadConfig) => {
    onSetConfig({ ...step.config, rest: { ...rest, payload: next } });
  };

  const setContentType = (content_type: ContentType) => {
    const next: PayloadConfig = { content_type };
    if (content_type === 'json') next.json = payload.json ?? '{\n  \n}';
    if (content_type === 'form_urlencoded') next.form_urlencoded = payload.form_urlencoded ?? [];
    if (content_type === 'multipart') next.multipart = payload.multipart ?? [];
    if (content_type === 'raw') next.raw = payload.raw ?? '';
    if (content_type === 'xml') next.xml = payload.xml ?? '';
    if (content_type === 'binary') next.binary = payload.binary ?? { file_path: '' };
    if (content_type === 'graphql')
      next.graphql = payload.graphql ?? { query: '', variables: '{}', operation_name: '' };
    setPayload(next);
  };

  const updateFormUrlEncoded = (entries: { id: string; key: string; value: string }[]) => {
    setPayload({
      ...payload,
      form_urlencoded: entries.map(e => ({ id: e.id, key: e.key, value: e.value })),
    });
  };

  const renderMultipartItem = (
    item: MultipartField,
    _index: number,
    update: <K extends keyof MultipartField>(field: K, value: MultipartField[K]) => void,
  ) => (
    <div className="space-y-2 p-3 rounded-lg" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={item.key}
            onChange={e => update('key', e.target.value)}
            placeholder="Field name"
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
        </div>
        <ToggleButtonGroup
          options={MULTIPART_FIELD_TYPES}
          value={item.field_type}
          onChange={(v) => update('field_type', v as MultipartFieldType)}
          size="sm"
        />
      </div>
      <input
        type="text"
        value={item.value}
        onChange={e => update('value', e.target.value)}
        placeholder={item.field_type === 'file' ? '/path/to/file.jpg' : 'Field value'}
        className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
        style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Content Type Selector */}
      <div>
        <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
          Content Type
        </label>
        <ToggleButtonGroup
          options={CONTENT_TYPE_OPTIONS}
          value={payload.content_type}
          onChange={(v) => setContentType(v as ContentType)}
          size="sm"
        />
      </div>

      {/* None */}
      {payload.content_type === 'none' && (
        <p className="text-[12px] py-2" style={{ color: 'var(--rm-text-muted)' }}>
          No request body will be sent with this step.
        </p>
      )}

      {/* JSON Editor */}
      {payload.content_type === 'json' && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
            JSON Body
          </label>
          <textarea
            value={payload.json ?? ''}
            onChange={e => setPayload({ ...payload, json: e.target.value })}
            placeholder='{\n  "key": "value"\n}'
            rows={10}
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-y font-mono"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)', minHeight: '120px' }}
            spellCheck={false}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
            Supports {'{{variable}}'} interpolation within JSON values.
          </p>
          {errors[`${prefix}.json`] && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.json`]}</p>
          )}
        </div>
      )}

      {/* Form URL-Encoded */}
      {payload.content_type === 'form_urlencoded' && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
            Form Fields
          </label>
          <KeyValueEditor
            entries={(payload.form_urlencoded ?? []).map(e => ({ id: e.id, key: e.key, value: e.value }))}
            onChange={updateFormUrlEncoded}
            keyPlaceholder="field"
            valuePlaceholder="value"
            addLabel="Add Field"
          />
        </div>
      )}

      {/* Multipart */}
      {payload.content_type === 'multipart' && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
            Multipart Fields
          </label>
          <DynamicListEditor
            items={payload.multipart ?? []}
            onChange={items => setPayload({ ...payload, multipart: items })}
            renderItem={renderMultipartItem}
            createDefault={create_default_multipart_field}
            addLabel="Add Field"
            emptyMessage="No multipart fields defined yet."
          />
        </div>
      )}

      {/* Raw */}
      {payload.content_type === 'raw' && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
            Raw Body
          </label>
          <textarea
            value={payload.raw ?? ''}
            onChange={e => setPayload({ ...payload, raw: e.target.value })}
            placeholder="Enter raw request body..."
            rows={8}
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-y font-mono"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)', minHeight: '100px' }}
            spellCheck={false}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
            Plain text body. Set the Content-Type header manually if needed.
          </p>
          {errors[`${prefix}.raw`] && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.raw`]}</p>
          )}
        </div>
      )}

      {/* XML */}
      {payload.content_type === 'xml' && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
            XML Body
          </label>
          <textarea
            value={payload.xml ?? ''}
            onChange={e => setPayload({ ...payload, xml: e.target.value })}
            placeholder='<?xml version="1.0"?>\n<root>\n  ...\n</root>'
            rows={10}
            className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-y font-mono"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)', minHeight: '120px' }}
            spellCheck={false}
          />
          {errors[`${prefix}.xml`] && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.xml`]}</p>
          )}
        </div>
      )}

      {/* Binary */}
      {payload.content_type === 'binary' && (
        <div>
          <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
            File Path
          </label>
          <input
            type="text"
            value={payload.binary?.file_path ?? ''}
            onChange={e => setPayload({ ...payload, binary: { file_path: e.target.value } })}
            placeholder="/path/to/upload.bin"
            className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
            Absolute or relative path to the binary file to upload.
          </p>
          {errors[`${prefix}.binary.file_path`] && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.binary.file_path`]}</p>
          )}
        </div>
      )}

      {/* GraphQL */}
      {payload.content_type === 'graphql' && (
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Query
            </label>
            <textarea
              value={payload.graphql?.query ?? ''}
              onChange={e =>
                setPayload({
                  ...payload,
                  graphql: { ...payload.graphql!, query: e.target.value },
                })
              }
              placeholder={'query GetUser($id: ID!) {\n  user(id: $id) {\n    id\n    name\n  }\n}'}
              rows={8}
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-y font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)', minHeight: '100px' }}
              spellCheck={false}
            />
            {errors[`${prefix}.graphql.query`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.graphql.query`]}</p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Variables
            </label>
            <textarea
              value={payload.graphql?.variables ?? '{}'}
              onChange={e =>
                setPayload({
                  ...payload,
                  graphql: { ...payload.graphql!, variables: e.target.value },
                })
              }
              placeholder='{\n  "id": "123"\n}'
              rows={4}
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border-none outline-none resize-y font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)', minHeight: '60px' }}
              spellCheck={false}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              JSON object of variables to pass to the GraphQL query.
            </p>
            {errors[`${prefix}.graphql.variables`] && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{errors[`${prefix}.graphql.variables`]}</p>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--rm-text-secondary)' }}>
              Operation Name{' '}
              <span className="font-normal" style={{ color: 'var(--rm-text-muted)' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={payload.graphql?.operation_name ?? ''}
              onChange={e =>
                setPayload({
                  ...payload,
                  graphql: { ...payload.graphql!, operation_name: e.target.value },
                })
              }
              placeholder="GetUser"
              className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none font-mono"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
              Required when the query document contains multiple operations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
