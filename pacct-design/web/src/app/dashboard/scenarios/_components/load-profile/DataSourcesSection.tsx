'use client';

import type { DataSource, DataSourceType, RandomField } from '../../types';
import { create_default_data_source, create_default_random_field } from '../../types';
import SectionCard from '../SectionCard';
import RmSelect from '@/components/ui/RmSelect';
import ToggleButtonGroup from '../ToggleButtonGroup';
import DynamicListEditor from '../DynamicListEditor';
import type { ToggleOption } from '../ToggleButtonGroup';

const sourceTypeOptions: ToggleOption<DataSourceType>[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
  { value: 'synthetic', label: 'Synthetic' },
  { value: 'random', label: 'Random' },
];

interface Props {
  dataSources: DataSource[];
  onChange: (sources: DataSource[]) => void;
}

function updateSource(
  sources: DataSource[],
  id: string,
  patch: Partial<DataSource>,
): DataSource[] {
  return sources.map(s => (s.id === id ? { ...s, ...patch } : s));
}

function setSourceType(source: DataSource, type: DataSourceType): DataSource {
  const base: DataSource = { id: source.id, name: source.name, type };
  switch (type) {
    case 'csv':
      base.csv = source.csv ?? { file_path: '', delimiter: ',', has_header: true, recycle_on_eof: true };
      break;
    case 'json':
      base.json = source.json ?? { file_path: '', root_path: '' };
      break;
    case 'synthetic':
      base.synthetic = source.synthetic ?? { generator: '', count: 100 };
      break;
    case 'random':
      base.random = source.random ?? { fields: [] };
      break;
  }
  return base;
}

export default function DataSourcesSection({ dataSources, onChange }: Props) {
  return (
    <SectionCard title="Data Sources" description="External data fed to virtual users during execution.">
      <DynamicListEditor<DataSource>
        items={dataSources}
        onChange={onChange}
        createDefault={create_default_data_source}
        addLabel="Add Data Source"
        emptyMessage="No data sources configured."
        reorderable
        renderItem={(item, _index, update) => (
          <div
            className="space-y-3 p-3 rounded-lg"
            style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}
          >
            {/* Name + Type */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Name</label>
                <input
                  type="text"
                  value={item.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="e.g. user-credentials"
                  className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                  style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Type</label>
                <ToggleButtonGroup
                  options={sourceTypeOptions}
                  value={item.type}
                  onChange={type => {
                    const updated = setSourceType(item, type);
                    onChange(dataSources.map(s => (s.id === item.id ? updated : s)));
                  }}
                  variant="pill"
                  size="sm"
                />
              </div>
            </div>

            {/* CSV config */}
            {item.type === 'csv' && item.csv && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>File Path</label>
                  <input
                    type="text"
                    value={item.csv.file_path}
                    onChange={e =>
                      onChange(updateSource(dataSources, item.id, { csv: { ...item.csv!, file_path: e.target.value } }))
                    }
                    placeholder="/data/users.csv"
                    className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Delimiter</label>
                    <input
                      type="text"
                      value={item.csv.delimiter}
                      onChange={e =>
                        onChange(updateSource(dataSources, item.id, { csv: { ...item.csv!, delimiter: e.target.value } }))
                      }
                      className="w-16 text-[13px] text-center px-2 py-2 rounded-lg border-none outline-none"
                      style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                    />
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={item.csv.has_header}
                      onChange={e =>
                        onChange(updateSource(dataSources, item.id, { csv: { ...item.csv!, has_header: e.target.checked } }))
                      }
                      className="rounded"
                    />
                    <span className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>Has Header</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={item.csv.recycle_on_eof}
                      onChange={e =>
                        onChange(updateSource(dataSources, item.id, { csv: { ...item.csv!, recycle_on_eof: e.target.checked } }))
                      }
                      className="rounded"
                    />
                    <span className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>Recycle on EOF</span>
                  </label>
                </div>
              </div>
            )}

            {/* JSON config */}
            {item.type === 'json' && item.json && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>File Path</label>
                  <input
                    type="text"
                    value={item.json.file_path}
                    onChange={e =>
                      onChange(updateSource(dataSources, item.id, { json: { ...item.json!, file_path: e.target.value } }))
                    }
                    placeholder="/data/payloads.json"
                    className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Root Path</label>
                  <input
                    type="text"
                    value={item.json.root_path}
                    onChange={e =>
                      onChange(updateSource(dataSources, item.id, { json: { ...item.json!, root_path: e.target.value } }))
                    }
                    placeholder="$.data[*]"
                    className="w-full text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>JSONPath expression to array of records.</p>
                </div>
              </div>
            )}

            {/* Synthetic config */}
            {item.type === 'synthetic' && item.synthetic && (
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Generator</label>
                  <input
                    type="text"
                    value={item.synthetic.generator}
                    onChange={e =>
                      onChange(updateSource(dataSources, item.id, { synthetic: { ...item.synthetic!, generator: e.target.value } }))
                    }
                    placeholder="e.g. faker, sequence"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Count</label>
                  <input
                    type="number"
                    value={item.synthetic.count}
                    onChange={e =>
                      onChange(updateSource(dataSources, item.id, { synthetic: { ...item.synthetic!, count: parseInt(e.target.value) || 0 } }))
                    }
                    min={1}
                    className="w-28 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                    style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                  />
                </div>
              </div>
            )}

            {/* Random config */}
            {item.type === 'random' && item.random && (
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--rm-text-muted)' }}>Random Fields</label>
                <DynamicListEditor<RandomField>
                  items={item.random.fields}
                  onChange={fields =>
                    onChange(updateSource(dataSources, item.id, { random: { fields } }))
                  }
                  createDefault={create_default_random_field}
                  addLabel="Add Field"
                  emptyMessage="No random fields defined."
                  renderItem={(field, _fi, fieldUpdate) => (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={field.name}
                          onChange={e => fieldUpdate('name', e.target.value)}
                          placeholder="Field name"
                          className="w-full text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
                        />
                      </div>
                      <div className="w-28">
                        <RmSelect
                          value={field.field_type}
                          onChange={v => fieldUpdate('field_type', v as RandomField['field_type'])}
                          options={[
                            { value: 'string', label: 'String' },
                            { value: 'number', label: 'Number' },
                            { value: 'uuid', label: 'UUID' },
                            { value: 'email', label: 'Email' },
                            { value: 'name', label: 'Name' },
                            { value: 'date', label: 'Date' },
                          ]}
                          size="sm"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={field.config}
                          onChange={e => fieldUpdate('config', e.target.value)}
                          placeholder="Config (optional)"
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
        )}
      />
    </SectionCard>
  );
}
