'use client';

import SectionCard from '../SectionCard';
import DynamicListEditor from '../DynamicListEditor';
import RmSelect from '@/components/ui/RmSelect';
import type { Variable, VariableSource } from '../../types';
import { create_default_variable } from '../../types';

const SOURCES: { value: VariableSource; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'environment', label: 'Env' },
  { value: 'extracted', label: 'Extracted' },
  { value: 'dataset', label: 'Dataset' },
  { value: 'function', label: 'Function' },
];

interface Props {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
}

export default function VariablesSection({ variables, onChange }: Props) {
  return (
    <SectionCard title="Variables" description="Global variables available to all steps via {{variableName}} interpolation.">
      <DynamicListEditor
        items={variables}
        onChange={onChange}
        createDefault={create_default_variable}
        addLabel="Add Variable"
        emptyMessage="No variables defined yet."
        renderItem={(item, _index, update) => (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={item.name}
              onChange={e => update('name', e.target.value)}
              placeholder="Variable name"
              className="flex-1 text-[13px] font-mono px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <input
              type="text"
              value={item.value}
              onChange={e => update('value', e.target.value)}
              placeholder="Value"
              className="flex-1 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
              style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
            />
            <RmSelect
              value={item.source}
              onChange={v => update('source', v as VariableSource)}
              options={SOURCES}
              size="sm"
            />
          </div>
        )}
      />
    </SectionCard>
  );
}
